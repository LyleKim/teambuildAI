# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

teambuildAI ("파비콘") — an AI-matching platform that pairs university students for hackathons/contests. Two-sided AI-driven matching: instead of one user messaging another, the system proposes matches to both sides and only opens a chat once both accept. Full context in `README.md` (Korean).

Monorepo: `frontend/` (React + Vite + TS) talks to `backend/` (Django + DRF) only through `/api/v1/...`; Vite proxies `/api`, `/admin`, `/static`, `/media`, `/ws` to Django in dev.

## Commands

### Backend (Django, from `backend/`, managed with `uv`)

```bash
docker compose up -d                                          # db + backend (from repo root)
docker compose exec backend uv run python manage.py migrate
docker compose exec backend uv run python manage.py createsuperuser
docker compose exec backend uv run python manage.py test                  # all tests
docker compose exec backend uv run python manage.py test matching         # single app
docker compose exec backend uv run python manage.py test matching.tests.SomeTestCase.test_x  # single test
docker compose exec backend uv run python manage.py issue_token <email>   # dev-only JWT issuance, bypasses Kakao login
```

Without Docker, run the same `uv run python manage.py ...` commands from inside `backend/` (requires `DB_HOST=localhost` and a reachable MySQL instance, plus a `DJANGO_SECRET_KEY` env var — see below).

### Frontend (from `frontend/`, pnpm 10.34.3 / Node 22)

```bash
pnpm install
pnpm dev              # Vite dev server on :8443, proxies to Django on :8000
pnpm build             # tsc --noEmit && vite build
pnpm typecheck          # tsc --noEmit only
pnpm format             # oxfmt
```

Point the dev proxy at a non-default Django port with `DJANGO_ORIGIN=http://127.0.0.1:9000 pnpm dev`.

### Environment setup

`cp .env.example .env` before first run. `DJANGO_SECRET_KEY` is required — Django refuses to start without it (no insecure fallback, intentionally, after a past leak). Generate one with:
```bash
docker compose run --rm backend python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
If the generated value contains `$`, regenerate — docker-compose treats it as a variable reference and silently truncates it. `KAKAO_*` vars are optional; without them every endpoint works except the Kakao login button.

## Architecture

### Backend: Django apps under `backend/`, routed at `/api/v1/` via `config/api_urls.py`

- **accounts** — Custom `User` (Kakao-OAuth-only; `password` is unusable outside the superuser) + `Profile` (matching-relevant fields: roles/skills/regions/interests as `JSONField`, plus free-text bio fields). Auth is Kakao OAuth end-to-end (`kakao_client.py` is a thin HTTP client, `auth_views.py` runs the redirect → code exchange → JWT-issue flow, get-or-create by `kakao_id`). No email/password signup path exists.
- **hackathons** — `Hackathon`, `Participation` (individual vs. team track), `Team` (role/headcount needs as `JSONField`). `meta/options/` and `stats/landing/` endpoints back frontend dropdowns/landing stats.
- **matching** — `RecommendationJob` (`pending/running/done/failed`) + `Recommendation`. Jobs run synchronously today but the job-record/polling contract (`job_id` → `/recommendations/{job_id}/status/`) is kept so a real async worker can be swapped in later without changing the frontend contract. `scoring.py: score_pair()` is a placeholder heuristic scorer (role complementarity, time/goal overlap) standing in for a future LLM call — its signature (`(requester_profile, candidate_profile) -> ScoredMatch`) is the seam to replace.
- **coffeechat** — `CoffeeChat` request/accept/reject between two users for a hackathon. Accepting one creates a `chat.ChatThread` (see `thread` FK) — this is the only way a chat thread gets created; there's no direct "create thread" endpoint.
- **chat** — `ChatThread` (unique per hackathon+user pair) and `ChatMessage` with `read_at` for unread tracking.
- **notifications** — `Notification` with a fixed `Type`/`Target` vocabulary consumed by the frontend badge/toast system. Other apps must create notifications through `notifications/services.py: notify()`, never by instantiating the model directly, to keep `type`/`target` combinations consistent.

Cross-cutting conventions:
- DRF defaults to `IsAuthenticated` + JWT auth (`config/settings.py`); individual views opt into `AllowAny` explicitly (hackathon list/detail, meta/stats, auth/*). Keep new public endpoints explicit rather than changing the default.
- `FRONTEND_ORIGINS` (== `CORS_ALLOWED_ORIGINS`) doubles as the Kakao-callback `redirect_uri` allowlist — required to prevent an open redirect that would leak JWTs; extend both together.
- Frontend TypeScript types in `frontend/src/types/index.ts` are meant to mirror DRF serializer output 1:1 in snake_case — when changing a serializer, update that file too.

### Frontend: see `frontend/AGENTS.md` (aliased from `frontend/CLAUDE.md`) for the full file-by-file map

Highlights not to duplicate reading that file: no React Query — data fetching is hand-rolled (`useQuery`/`useMutation` in `src/hooks/`), routing is a dependency-free hash router (`src/lib/router.tsx`), and new API integrations must follow types → `src/api/index.ts` → hook, not ad hoc `fetch` calls in components.
