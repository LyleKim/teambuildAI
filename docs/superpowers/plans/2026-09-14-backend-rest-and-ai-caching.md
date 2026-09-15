# Backend REST Design & AI Recommendation Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop re-calling the Groq LLM for recommendation text every single time a user regenerates recommendations with an unchanged profile pair, and collapse the handful of verb-suffixed action endpoints (`/accept/`, `/reject/`, `/progress/`, `/delete/`, `/end/`) into plain resource PATCH/DELETE, which is the concrete REST deviation this audit found.

**Architecture:** Two independent fixes bundled because both came out of the same "backend code quality" review:
1. **Caching** — `matching/ai_reason.py: generate_ai_reasons()` calls Groq once per "다시 추천받기" click for the top 5 candidates, unconditionally, even if neither profile changed since the last call. Since the prompt is fully determined by the two profiles' quantitative fields (`_quant_profile()` already strips everything else) plus the score, the fix is a content-addressed cache: key = hash of `(requester quant profile, candidate quant profile, score)`, backed by Django's built-in `DatabaseCache` (no new infra — reuses the existing MySQL instance, no Redis needed). A cache hit skips that candidate's Groq round-trip entirely.
2. **REST cleanup** — `coffeechat` has five URLs (`/coffeechats/<id>/`, `/accept/`, `/reject/`, `/progress/`, `/delete/`) where DRF's own resource-oriented pattern (`GET`/`PATCH`/`DELETE` on one URL) would do; `hackathons` has the same shape once, for participation (`/participations/<id>/` DELETE-only, `/participations/<id>/end/` PATCH-only). Both get collapsed to one URL per resource that dispatches on HTTP method (and, for coffeechat, on the `status` value in the PATCH body, validated against the actual state machine already encoded in `CoffeeChat.Status`).

**Tech Stack:** Django's built-in cache framework (`django.core.cache.backends.db.DatabaseCache`) — deliberately not `django-redis`/Redis, since there's no cache infra in `docker-compose.yml` today and the access pattern (batch-of-5, human-paced "재추천" clicks) doesn't need sub-millisecond latency.

**Spec:** No separate spec doc — this is an internal code-quality audit; findings and scope are recorded here.

## Global Constraints

- No new external dependency and no new docker-compose service — use what Django and MySQL already provide (ladder rung: stdlib/already-installed before new infra).
- Every existing behavior (notifications sent on state transitions, permission checks, idempotency of "종료 표시") must be preserved exactly — this is a refactor, not a feature change.
- Both backend and frontend live in this monorepo and only this frontend consumes these endpoints (per `CLAUDE.md`), so changing the URL/method shape is safe as long as `frontend/src/api/index.ts` is updated in the same task.
- Backend TDD: write/adjust the failing test first, then implement, per app's existing `APITestCase` conventions.

## Audit scope note (not turned into tasks)

`notifications/read-all/` (bulk mark-all-read) and `notifications/<id>/read/` also use a verb suffix, but bulk state changes over an unbounded collection don't have a clean single-resource PATCH target in REST — this is accepted, common practice (e.g. GitHub's own notification API does the same), so it's left alone here.

---

## File Structure

- Modify `backend/config/settings.py` — add `CACHES` pointing at a DB-backed cache table.
- Create a migration in `backend/matching/migrations/` that creates the cache table.
- Modify `backend/matching/ai_reason.py` — add the content-hash cache around the Groq call.
- Modify `backend/matching/tests.py` — test that a repeat call with the same profiles doesn't hit Groq again.
- Modify `backend/coffeechat/views.py`, `backend/coffeechat/urls.py`, `backend/coffeechat/tests.py` — collapse accept/reject/progress/delete into one `CoffeeChatDetailView`.
- Modify `backend/hackathons/views.py`, `backend/hackathons/urls.py`, `backend/hackathons/tests.py` — collapse participation end/delete into one `ParticipationDetailView`.
- Modify `frontend/src/api/index.ts` — point `coffeechatApi`/`participationApi` calls at the new URLs/methods.

---

### Task 1: DB-backed cache table

**Files:**
- Modify: `backend/config/settings.py`
- Create: `backend/matching/migrations/0003_create_ai_reason_cache_table.py` (number follows whatever the latest existing migration in `matching/migrations/` is — check with `ls backend/matching/migrations/` before naming it)

**Interfaces:**
- Produces: a working `django.core.cache.cache` (default alias) backed by a DB table named `ai_reason_cache`, available to Task 2.

- [ ] **Step 1: Add the CACHES setting**

In `backend/config/settings.py`, after the `AUTH_USER_MODEL = 'accounts.User'` line, add:

```python
# Groq 추천 문구 캐싱용. Redis 등 새 인프라를 추가하는 대신 기존 MySQL을 그대로 쓴다 —
# "재추천" 클릭은 사람이 누르는 빈도라 초저지연이 필요 없다 (matching/ai_reason.py 참고).
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'ai_reason_cache',
    }
}
```

- [ ] **Step 2: Check the latest migration number in `matching`**

Run: `ls backend/matching/migrations/`

- [ ] **Step 3: Create the migration that creates the cache table**

Create `backend/matching/migrations/000N_create_ai_reason_cache_table.py` (replace `000N` with the next number after Step 2's output):

```python
from django.core.management import call_command
from django.db import migrations


def create_cache_table(apps, schema_editor):
    call_command('createcachetable', 'ai_reason_cache')


def drop_cache_table(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('DROP TABLE IF EXISTS ai_reason_cache')


class Migration(migrations.Migration):
    dependencies = [
        # 이전 마이그레이션 파일명으로 교체 (Step 2에서 확인)
        ('matching', '000<N-1>_previous_migration_name'),
    ]

    operations = [
        migrations.RunPython(create_cache_table, drop_cache_table),
    ]
```

- [ ] **Step 4: Run the migration**

Run: `docker compose exec backend uv run python manage.py migrate matching`
Expected: the new migration applies and creates the `ai_reason_cache` table (verify with `docker compose exec db mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW TABLES LIKE 'ai_reason_cache';" $MYSQL_DATABASE`)

- [ ] **Step 5: Commit**

```bash
git add backend/config/settings.py backend/matching/migrations/
git commit -m "feat: add DB-backed cache table for AI recommendation text"
```

---

### Task 2: Cache Groq-generated recommendation text by content hash

**Files:**
- Modify: `backend/matching/ai_reason.py`
- Test: `backend/matching/tests.py`

**Interfaces:**
- Consumes: `django.core.cache.cache` (default alias, from Task 1).
- Produces: `generate_ai_reasons(requester_profile, ranked_candidates)` keeps its exact existing signature and return shape (`{target_user.id: {"fit_points": ..., "complement": ..., "check_point": ..., "reason": ...}}`) — callers in `matching/views.py` need no changes.

- [ ] **Step 1: Check existing test setup for this module**

Run: `grep -n "ai_reason\|generate_ai_reasons\|httpx" backend/matching/tests.py`

(If no existing tests mock `httpx.post` for this function, the new test below introduces that pattern using `unittest.mock.patch`.)

- [ ] **Step 2: Write the failing test**

Add to `backend/matching/tests.py`:

```python
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings

from accounts.models import Profile, User
from matching.ai_reason import generate_ai_reasons
from matching.scoring import ScoredMatch


class AiReasonCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.requester = User.objects.create_user(email='req@x.com', name='요청자', password='x')
        self.candidate_user = User.objects.create_user(email='cand@x.com', name='후보', password='x')
        self.requester_profile = Profile.objects.create(user=self.requester, roles=['백엔드'])
        self.candidate_profile = Profile.objects.create(user=self.candidate_user, roles=['프론트엔드'])
        self.match = ScoredMatch(score=70, fit_points='', complement='', check_point='', reason='')

    def _groq_response(self):
        return {
            'choices': [{
                'message': {
                    'content': (
                        '{"candidates": [{"id": %d, "fit_points": "a", "complement": "b", '
                        '"check_point": "c", "reason": "d"}]}' % self.candidate_user.id
                    )
                }
            }]
        }

    @override_settings(GROQ_API_KEY='test-key', GROQ_MODEL='test-model')
    @patch('matching.ai_reason.httpx.post')
    def test_second_call_with_same_profiles_skips_groq(self, mock_post):
        mock_post.return_value.raise_for_status.return_value = None
        mock_post.return_value.json.return_value = self._groq_response()

        ranked = [(self.candidate_user, self.candidate_profile, self.match)]

        first = generate_ai_reasons(self.requester_profile, ranked)
        self.assertEqual(mock_post.call_count, 1)
        self.assertEqual(first[self.candidate_user.id]['fit_points'], 'a')

        second = generate_ai_reasons(self.requester_profile, ranked)
        self.assertEqual(mock_post.call_count, 1)  # 캐시 히트라 두 번째는 Groq를 다시 부르지 않는다
        self.assertEqual(second[self.candidate_user.id]['fit_points'], 'a')
```

- [ ] **Step 3: Run test to verify it fails**

Run: `docker compose exec backend uv run python manage.py test matching.tests.AiReasonCacheTests -v 2`
Expected: FAIL with `AssertionError: 2 != 1` (no caching yet, so the second call hits Groq again)

- [ ] **Step 4: Implement the cache**

Replace `backend/matching/ai_reason.py` in full:

```python
"""
Groq 배치 호출: 이미 점수가 매겨진 후보 중 상위 N명에 대해서만 '추천 이유' 문구를
자연어로 다듬는다. 점수 산정 자체는 여기서 하지 않는다 — scoring.py: score_pair()가
이미 계산한 값을 문장으로 설명만 한다.

"다시 추천받기" 한 번당 Groq 호출을 정확히 1번으로 고정한다(N명을 한 프롬프트에 묶어
한 번에 받음) — 후보 수와 무관하게 사용량을 예측 가능하게 하기 위함.

프로필의 자유 텍스트(자기소개, 포트폴리오 링크, 오픈채팅, 전화번호)는 절대 보내지
않는다. 정량적 필드(역할/기술스택/지역/시간대/목표/협업/소통/관심사)만 프롬프트에
실어 개인정보 노출 범위를 최소화한다.

두 프로필의 정량 필드 + 점수가 같으면 문구도 항상 같으므로, 그 조합을 키로 캐싱해서
프로필이 안 바뀐 재추천 요청은 Groq를 다시 부르지 않는다 (config/settings.py의
CACHES, DB 기반 캐시 테이블 사용).
"""
import hashlib
import json

import httpx
from django.conf import settings
from django.core.cache import cache

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
# ponytail: 프로필이 바뀌면 새 키라 자동으로 무효화되지만, 옛 키의 캐시 행은 TTL이
# 지나야 지워진다 — DatabaseCache가 set()마다 확률적으로 만료 행을 청소하므로 별도
# 정리 작업 없이도 무한정 쌓이진 않는다. 정확한 즉시 삭제가 필요해지면 그때 추가한다.
CACHE_TTL_SECONDS = 60 * 60 * 24 * 7  # 7일 — 정량 프로필은 이 기간 안에 잘 안 바뀐다

SYSTEM_PROMPT = (
    '너는 해커톤 팀 매칭 서비스의 추천 이유 작성 도우미다. 아래 규칙을 반드시 지켜라.\n'
    '1. 입력으로 주어진 정량 데이터(역할, 기술 스택, 활동 시간, 선호 지역, 목표, 협업/소통 방식, '
    '관심사, 매칭 점수)에 있는 사실만 근거로 사용한다.\n'
    '2. 입력에 없는 정보(학교, 나이, 경력 연차, 성격, 실적 등)는 추측하거나 지어내지 않는다.\n'
    '3. 각 후보마다 fit_points(잘 맞는 점), complement(상호 보완), check_point(체크 포인트), '
    'reason(추천 이유)을 각 1문장씩, 한국어 존댓말로 작성한다.\n'
    '4. 반드시 JSON 객체 하나만 출력한다. 다른 설명이나 텍스트는 출력하지 않는다.\n'
    '출력 형식: {"candidates": [{"id": <숫자>, "fit_points": "...", "complement": "...", '
    '"check_point": "...", "reason": "..."}, ...]}'
)


def _quant_profile(profile):
    """AI에 보낼 정량 필드만 추린다 — 자기소개/링크/연락처는 제외."""
    return {
        'roles': profile.roles,
        'skills': profile.skills,
        'available_time': profile.available_time,
        'regions': profile.regions,
        'goal': profile.goal,
        'collaboration': profile.collaboration,
        'communication': profile.communication,
        'interests': profile.interests,
    }


def _cache_key(requester_profile, candidate_profile, score):
    payload = json.dumps(
        {
            'requester': _quant_profile(requester_profile),
            'candidate': _quant_profile(candidate_profile),
            'score': score,
        },
        sort_keys=True, ensure_ascii=False,
    )
    digest = hashlib.sha256(payload.encode()).hexdigest()
    return f'ai_reason:{digest}'


def _call_groq(requester_profile, misses):
    """misses: [(target_user, candidate_profile, ScoredMatch), ...] — 캐시에 없던 후보만."""
    user_prompt = json.dumps(
        {
            'requester': _quant_profile(requester_profile),
            'candidates': [
                {'id': user.id, 'profile': _quant_profile(candidate_profile), 'score': match.score}
                for user, candidate_profile, match in misses
            ],
        },
        ensure_ascii=False,
    )

    try:
        response = httpx.post(
            GROQ_URL,
            headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}'},
            json={
                'model': settings.GROQ_MODEL,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_prompt},
                ],
                'temperature': 0.3,
                'response_format': {'type': 'json_object'},
            },
            timeout=10,
        )
        response.raise_for_status()
        parsed = json.loads(response.json()['choices'][0]['message']['content'])
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return {}

    results = {}
    for item in parsed.get('candidates', []):
        try:
            results[int(item['id'])] = {
                'fit_points': str(item['fit_points']),
                'complement': str(item['complement']),
                'check_point': str(item['check_point']),
                'reason': str(item['reason']),
            }
        except (KeyError, TypeError, ValueError):
            continue  # 후보 하나가 형식을 어겨도 나머지는 살린다
    return results


def generate_ai_reasons(requester_profile, ranked_candidates):
    """
    ranked_candidates: [(target_user, candidate_profile, ScoredMatch), ...] (상위 N명만 넘길 것)
    반환: {target_user.id: {"fit_points": ..., "complement": ..., "check_point": ..., "reason": ...}}
    실패(키 없음/타임아웃/파싱 오류 등)하면 조용히 빈 dict를 반환해 호출부가 템플릿 문구로
    폴백할 수 있게 한다 — 이 함수가 예외를 던지면 추천 전체가 실패해버리기 때문.
    """
    if not settings.GROQ_API_KEY or not ranked_candidates:
        return {}

    keyed = {
        user.id: (_cache_key(requester_profile, candidate_profile, match.score), user, candidate_profile, match)
        for user, candidate_profile, match in ranked_candidates
    }

    cached = cache.get_many([key for key, *_ in keyed.values()])
    results = {}
    misses = []
    for user_id, (key, user, candidate_profile, match) in keyed.items():
        if key in cached:
            results[user_id] = cached[key]
        else:
            misses.append((user, candidate_profile, match))

    if not misses:
        return results

    fresh = _call_groq(requester_profile, misses)

    to_cache = {}
    for user, candidate_profile, match in misses:
        if user.id in fresh:
            results[user.id] = fresh[user.id]
            key = keyed[user.id][0]
            to_cache[key] = fresh[user.id]

    if to_cache:
        cache.set_many(to_cache, timeout=CACHE_TTL_SECONDS)

    return results
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec backend uv run python manage.py test matching.tests.AiReasonCacheTests -v 2`
Expected: PASS

- [ ] **Step 6: Run the full matching test suite to check for regressions**

Run: `docker compose exec backend uv run python manage.py test matching -v 2`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/matching/ai_reason.py backend/matching/tests.py
git commit -m "feat: cache Groq recommendation text by profile content hash"
```

---

### Task 3: Collapse CoffeeChat accept/reject/progress/delete into one resource endpoint

**Files:**
- Modify: `backend/coffeechat/views.py`
- Modify: `backend/coffeechat/urls.py`
- Modify: `backend/coffeechat/tests.py`
- Modify: `frontend/src/api/index.ts:246-266`

**Interfaces:**
- Produces: `PATCH /api/v1/coffeechats/<id>/` with body `{"status": "accepted"|"rejected"|"in_progress"|"completed"}`, and `DELETE /api/v1/coffeechats/<id>/`, both replacing the four old verb-suffixed URLs. `GET /api/v1/coffeechats/<id>/` keeps its existing response shape (`CoffeeChatSerializer`).

- [ ] **Step 1: Update the existing tests to hit the new URLs first (still failing — old views still there)**

In `backend/coffeechat/tests.py`, replace every occurrence of the old action URLs with the new resource URL + PATCH body:

```python
    def test_progress_moves_forward_one_step_at_a_time(self):
        cc_id = self._send().data['id']
        self.client.force_authenticate(self.receiver)
        self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'accepted'})

        # accepted -> completed 건너뛰기는 막힌다
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'completed'})
        self.assertEqual(res.status_code, 400)

        # accepted -> in_progress -> completed는 양쪽 다 호출 가능
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'in_progress'})
        self.assertEqual(res.status_code, 200)
        self.client.force_authenticate(self.sender)
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'completed'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'completed')

    def test_progress_rejected_while_still_pending(self):
        cc_id = self._send().data['id']
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'in_progress'})
        self.assertEqual(res.status_code, 400)

    def test_delete_allowed_for_participants_only(self):
        cc_id = self._send().data['id']

        self.client.force_authenticate(self.stranger)
        res = self.client.delete(f'/api/v1/coffeechats/{cc_id}/')
        self.assertEqual(res.status_code, 404)
        self.assertTrue(CoffeeChat.objects.filter(id=cc_id).exists())

        self.client.force_authenticate(self.receiver)
        res = self.client.delete(f'/api/v1/coffeechats/{cc_id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(CoffeeChat.objects.filter(id=cc_id).exists())

    def test_teammates_only_lists_accepted_and_beyond(self):
        pending_id = self._send().data['id']

        self.client.force_authenticate(self.receiver)
        res = self.client.get(f'/api/v1/hackathons/{self.hackathon.id}/teammates/')
        self.assertEqual(res.data, [])  # 아직 pending이라 팀원이 아니다

        self.client.patch(f'/api/v1/coffeechats/{pending_id}/', {'status': 'accepted'})
        res = self.client.get(f'/api/v1/hackathons/{self.hackathon.id}/teammates/')
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['counterpart']['id'], self.sender.id)
        self.assertIsNone(res.data[0]['my_review'])

        # 발신자 쪽에서 봐도 자신 기준 상대(수신자)로 대칭적으로 보인다
        self.client.force_authenticate(self.sender)
```

(Leave the rest of that test method and any lines after it untouched — only the URLs above change; check `grep -n "/accept/\|/reject/\|/progress/\|/delete/" backend/coffeechat/tests.py` afterward to confirm none remain.)

Also add two new tests for the receiver-only guard and the not-a-valid-transition-target guard, which the old separate views didn't need to check explicitly (each old view only handled its own fixed target status) but the merged view does:

```python
    def test_accept_forbidden_for_sender(self):
        cc_id = self._send().data['id']
        # sender가 자기 자신이 보낸 신청을 스스로 accept 하려는 경우
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'accepted'})
        self.assertEqual(res.status_code, 400)

    def test_unknown_status_value_is_rejected(self):
        cc_id = self._send().data['id']
        self.client.force_authenticate(self.receiver)
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/', {'status': 'not-a-real-status'})
        self.assertEqual(res.status_code, 400)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run python manage.py test coffeechat -v 2`
Expected: FAIL (404s — the old URLs are gone from the tests but the views/URLs haven't moved yet)

- [ ] **Step 3: Replace the views**

Replace `backend/coffeechat/views.py` in full:

```python
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from chat.models import ChatThread
from hackathons.models import Hackathon
from notifications.models import Notification
from notifications.services import notify

from .models import CoffeeChat
from .serializers import CoffeeChatSerializer, TeammateSerializer


class CoffeeChatCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to_user_id = request.data.get('to_user_id')
        hackathon_id = request.data.get('hackathon_id')
        message = (request.data.get('message') or '').strip()

        if not to_user_id or not hackathon_id:
            raise ValidationError('to_user_id, hackathon_id는 필수입니다.')
        if not message:
            raise ValidationError({'message': '메시지를 입력해주세요.'})
        if int(to_user_id) == request.user.id:
            raise ValidationError('자기 자신에게는 신청할 수 없어요.')

        sender_profile = getattr(request.user, 'profile', None)
        open_chat = sender_profile.open_chat if sender_profile else ''
        if not open_chat:
            raise ValidationError({'open_chat': '프로필에 오픈채팅 링크를 먼저 등록해주세요.'})

        receiver = get_object_or_404(User, pk=to_user_id)
        hackathon = get_object_or_404(Hackathon, pk=hackathon_id)

        # 방향 상관없이(내가 보냈든 상대가 보냈든) 진행 중인 커피챗이 있으면 중복 신청 막기
        # -> 나중에 accept()가 (hackathon, sender, receiver) 쌍으로 스레드를 만들 때
        # 같은 두 사람 사이에 스레드가 두 개 생기는 걸 원천 차단한다.
        in_progress = CoffeeChat.objects.filter(
            hackathon=hackathon, status__in=[CoffeeChat.Status.PENDING, CoffeeChat.Status.ACCEPTED],
        ).filter(
            Q(sender=request.user, receiver=receiver) | Q(sender=receiver, receiver=request.user)
        ).exists()
        if in_progress:
            raise ValidationError('이미 이 사람과 진행 중인 커피챗이 있어요.')

        coffeechat = CoffeeChat.objects.create(
            sender=request.user, receiver=receiver, hackathon=hackathon,
            message=message, sender_contact=open_chat,
        )
        notify(
            user=receiver, type_=Notification.Type.REQUEST,
            text=f'{request.user.name}님이 커피챗을 신청했어요',
            target=Notification.Target.COFFEECHAT_INBOX, target_id=coffeechat.id,
        )
        serializer = CoffeeChatSerializer(coffeechat, context={'request': request})
        return Response(serializer.data, status=201)


class CoffeeChatReceivedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CoffeeChat.objects.filter(receiver=request.user).select_related(
            'sender__profile', 'hackathon', 'thread'
        ).order_by('-created_at')
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(CoffeeChatSerializer(qs, many=True, context={'request': request}).data)


class CoffeeChatSentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CoffeeChat.objects.filter(sender=request.user).select_related(
            'receiver__profile', 'hackathon', 'thread'
        ).order_by('-created_at')
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(CoffeeChatSerializer(qs, many=True, context={'request': request}).data)


class CoffeeChatDetailView(APIView):
    """
    단건 조회(GET), 상태 전이(PATCH), 삭제(DELETE)를 리소스 URL 하나로 묶는다.
    예전엔 /accept/ /reject/ /progress/ /delete/ 로 URL이 나뉘어 있었는데, 전부
    "이 커피챗의 상태를 바꾼다"는 같은 동작이라 리소스에 대한 메서드로 합친다.

    상태 전이 규칙(PATCH body의 status 값): {현재 상태: {요청 가능한 다음 상태: 필요 권한}}.
    'receiver'는 수신자만, 'participant'는 sender/receiver 누구나 — get_object()가
    이미 참여자로 쿼리셋을 좁혀두므로 'participant'는 별도 검사가 필요 없다.
    """

    permission_classes = [IsAuthenticated]

    TRANSITIONS = {
        CoffeeChat.Status.PENDING: {
            CoffeeChat.Status.ACCEPTED: 'receiver',
            CoffeeChat.Status.REJECTED: 'receiver',
        },
        CoffeeChat.Status.ACCEPTED: {
            CoffeeChat.Status.IN_PROGRESS: 'participant',
        },
        CoffeeChat.Status.IN_PROGRESS: {
            CoffeeChat.Status.COMPLETED: 'participant',
        },
    }

    def get_object(self, request, coffeechat_id):
        return get_object_or_404(
            CoffeeChat, Q(sender=request.user) | Q(receiver=request.user), pk=coffeechat_id,
        )

    def get(self, request, coffeechat_id):
        coffeechat = self.get_object(request, coffeechat_id)
        return Response(CoffeeChatSerializer(coffeechat, context={'request': request}).data)

    def patch(self, request, coffeechat_id):
        coffeechat = self.get_object(request, coffeechat_id)
        target = request.data.get('status')
        allowed = self.TRANSITIONS.get(coffeechat.status, {})
        role_required = allowed.get(target)

        if role_required is None:
            raise ValidationError(f'{coffeechat.get_status_display()} 상태에서는 변경할 수 없어요.')
        if role_required == 'receiver' and request.user.id != coffeechat.receiver_id:
            raise ValidationError('수신자만 처리할 수 있어요.')

        coffeechat.status = target
        update_fields = ['status']

        if target == CoffeeChat.Status.ACCEPTED:
            thread, _ = ChatThread.objects.get_or_create(
                hackathon=coffeechat.hackathon, user_a=coffeechat.sender, user_b=coffeechat.receiver,
            )
            coffeechat.thread = thread
            coffeechat.responded_at = timezone.now()
            update_fields += ['thread', 'responded_at']
        elif target == CoffeeChat.Status.REJECTED:
            coffeechat.responded_at = timezone.now()
            update_fields.append('responded_at')

        coffeechat.save(update_fields=update_fields)
        self._notify_transition(request, coffeechat, target)

        return Response(CoffeeChatSerializer(coffeechat, context={'request': request}).data)

    def delete(self, request, coffeechat_id):
        """상태와 무관하게 참여자 본인이 삭제한다. 연결된 채팅방/메시지는 건드리지 않는다."""
        coffeechat = self.get_object(request, coffeechat_id)
        coffeechat.delete()
        return Response(status=204)

    def _notify_transition(self, request, coffeechat, target):
        if target == CoffeeChat.Status.ACCEPTED:
            notify(
                user=coffeechat.sender, type_=Notification.Type.ACCEPTED,
                text=f'{coffeechat.receiver.name}님이 커피챗을 수락했어요',
                target=Notification.Target.COFFEECHAT_MATCHED, target_id=coffeechat.id,
            )
        elif target == CoffeeChat.Status.REJECTED:
            notify(
                user=coffeechat.sender, type_=Notification.Type.REJECTED,
                text=f'{coffeechat.receiver.name}님이 커피챗을 거절했어요',
                target=Notification.Target.COFFEECHAT_INBOX, target_id=coffeechat.id,
            )
        else:
            counterpart = coffeechat.receiver if request.user.id == coffeechat.sender_id else coffeechat.sender
            notify(
                user=counterpart, type_=Notification.Type.ACCEPTED,
                text=f'{request.user.name}님이 커피챗을 "{coffeechat.get_status_display()}"(으)로 표시했어요',
                target=Notification.Target.COFFEECHAT_MATCHED, target_id=coffeechat.id,
            )


class TeammatesView(APIView):
    """해당 해커톤에서 나와 커피챗이 수락된(진행중/완료 포함) 상대 목록. 정식 팀 멤버십
    테이블이 없어 '팀원'을 이 관계로 유추한다."""

    permission_classes = [IsAuthenticated]

    def get(self, request, hackathon_id):
        qs = CoffeeChat.objects.filter(
            hackathon_id=hackathon_id,
            status__in=[
                CoffeeChat.Status.ACCEPTED, CoffeeChat.Status.IN_PROGRESS, CoffeeChat.Status.COMPLETED,
            ],
        ).filter(
            Q(sender=request.user) | Q(receiver=request.user)
        ).select_related('sender__profile', 'receiver__profile', 'hackathon', 'thread')
        return Response(TeammateSerializer(qs, many=True, context={'request': request}).data)
```

Note: `generics` is no longer used in this file — the import line `from rest_framework import generics` should be dropped (it was only used by the old `CoffeeChatDetailView(generics.RetrieveAPIView)`).

- [ ] **Step 4: Update the URLs**

Replace `backend/coffeechat/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path('coffeechats/', views.CoffeeChatCreateView.as_view()),
    path('coffeechats/received/', views.CoffeeChatReceivedListView.as_view()),
    path('coffeechats/sent/', views.CoffeeChatSentListView.as_view()),
    path('coffeechats/<int:coffeechat_id>/', views.CoffeeChatDetailView.as_view()),
    path('hackathons/<int:hackathon_id>/teammates/', views.TeammatesView.as_view()),
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec backend uv run python manage.py test coffeechat -v 2`
Expected: PASS

- [ ] **Step 6: Update the frontend API layer**

Replace `frontend/src/api/index.ts:246-266`:

```ts
  /** 수락하면 채팅방이 생성되므로 응답의 thread_id로 바로 이동할 수 있다. */
  accept(id: number) {
    return api.patch<CoffeeChat>(`/coffeechats/${id}/`, { status: 'accepted' })
  },

  reject(id: number) {
    return api.patch<CoffeeChat>(`/coffeechats/${id}/`, { status: 'rejected' })
  },

  /** accepted -> in_progress -> completed 순서로만 한 단계씩 넘어간다. */
  setProgress(id: number, status: 'in_progress' | 'completed') {
    return api.patch<CoffeeChat>(`/coffeechats/${id}/`, { status })
  },

  remove(id: number) {
    return api.delete<void>(`/coffeechats/${id}/`)
  },

  detail(id: number) {
    return api.get<CoffeeChat>(`/coffeechats/${id}/`)
  },
```

- [ ] **Step 7: Typecheck the frontend**

Run: `cd frontend && pnpm typecheck`
Expected: PASS (function signatures unchanged, only the URL bodies inside them changed)

- [ ] **Step 8: Manual verification**

With `docker compose up -d` and `pnpm dev` running: send a coffeechat request between two test accounts, accept it, advance it through in_progress → completed, and delete one, confirming each still works end to end in the browser (커피챗 받은 요청함/보낸 요청함 화면).

- [ ] **Step 9: Commit**

```bash
git add backend/coffeechat/views.py backend/coffeechat/urls.py backend/coffeechat/tests.py frontend/src/api/index.ts
git commit -m "refactor: collapse coffeechat accept/reject/progress/delete into resource PATCH/DELETE"
```

---

### Task 4: Collapse Participation end/delete into one resource endpoint

**Files:**
- Modify: `backend/hackathons/views.py`
- Modify: `backend/hackathons/urls.py`
- Modify: `backend/hackathons/tests.py`
- Modify: `frontend/src/api/index.ts:98-105`

**Interfaces:**
- Produces: `PATCH /api/v1/participations/<pk>/` (marks `ended_at`, idempotent) and `DELETE /api/v1/participations/<pk>/` (existing behavior, unchanged), both on one URL, replacing the separate `/end/` URL.

- [ ] **Step 1: Update the existing tests to hit the new URL first (still failing — old view still there)**

In `backend/hackathons/tests.py`, in `ParticipationEndTests`, replace every `f'/api/v1/participations/{self.participation.id}/end/'` with `f'/api/v1/participations/{self.participation.id}/'`:

```python
    def test_end_sets_timestamp_without_deleting(self):
        res = self.client.patch(f'/api/v1/participations/{self.participation.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data['ended_at'])
        self.assertTrue(Participation.objects.filter(id=self.participation.id).exists())

    def test_end_is_idempotent(self):
        self.client.patch(f'/api/v1/participations/{self.participation.id}/')
        first = Participation.objects.get(id=self.participation.id).ended_at

        res = self.client.patch(f'/api/v1/participations/{self.participation.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Participation.objects.get(id=self.participation.id).ended_at, first)

    def test_cannot_end_others_participation(self):
        self.client.force_authenticate(self.other)
        res = self.client.patch(f'/api/v1/participations/{self.participation.id}/')
        self.assertEqual(res.status_code, 404)
        self.assertIsNone(Participation.objects.get(id=self.participation.id).ended_at)
```

Also check whether any test in this file exercises `ParticipationDestroyView`'s DELETE behavior (`grep -n "participations/{.*}/'" backend/hackathons/tests.py` and look for a `.delete(` call) — if one exists, leave its URL as-is (`/participations/<pk>/` was already correct for DELETE) but note it now hits the merged view.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run python manage.py test hackathons.tests.ParticipationEndTests -v 2`
Expected: FAIL (404s — `/participations/<id>/` PATCH doesn't exist yet, only DELETE does)

- [ ] **Step 3: Replace the two views with one**

In `backend/hackathons/views.py`, replace the `ParticipationDestroyView` and `ParticipationEndView` classes with:

```python
class ParticipationDetailView(APIView):
    """
    참가 기록 단건. DELETE는 참가 취소(레코드 삭제), PATCH는 종료 표시(ended_at만 세팅,
    삭제는 아님 — 팀원/TDL은 계속 조회할 수 있어야 한다). 예전엔 /end/ 로 URL이 따로
    있었는데 같은 리소스에 대한 서로 다른 동작이라 메서드로 합친다.
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 본인 참가 기록만 조작 가능 (쿼리셋 자체를 좁혀서 타인 것은 404로 처리)
        return Participation.objects.filter(user=self.request.user)

    def patch(self, request, pk):
        participation = get_object_or_404(self.get_queryset(), pk=pk)
        if participation.ended_at is None:
            participation.ended_at = timezone.now()
            participation.save(update_fields=['ended_at'])
        return Response(ParticipationSerializer(participation).data)

    def delete(self, request, pk):
        participation = get_object_or_404(self.get_queryset(), pk=pk)
        participation.delete()
        return Response(status=204)
```

Check the top of `backend/hackathons/views.py` for the exact existing import line providing `APIView`/`Response`/`get_object_or_404`/`IsAuthenticated`/`timezone` (they're already imported and used by the views being replaced) — no new imports should be needed. If `generics` is still used elsewhere in this file (it is, e.g. `HackathonListView`), leave that import alone.

- [ ] **Step 4: Update the URLs**

In `backend/hackathons/urls.py`, replace:

```python
    path('me/participations/', views.MyParticipationListView.as_view()),
    path('participations/<int:pk>/', views.ParticipationDestroyView.as_view()),
    path('participations/<int:pk>/end/', views.ParticipationEndView.as_view()),
```

with:

```python
    path('me/participations/', views.MyParticipationListView.as_view()),
    path('participations/<int:pk>/', views.ParticipationDetailView.as_view()),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec backend uv run python manage.py test hackathons -v 2`
Expected: PASS

- [ ] **Step 6: Update the frontend API layer**

Replace `frontend/src/api/index.ts:102-105`:

```ts
  /** 삭제가 아니라 완료 표시 — 팀원/TDL은 계속 조회할 수 있다. */
  end(participationId: number) {
    return api.patch<Participation>(`/participations/${participationId}/`)
  },
```

- [ ] **Step 7: Typecheck the frontend**

Run: `cd frontend && pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Manual verification**

Join a hackathon as an individual participant, then use the "프로젝트 종료" action in 마이페이지 and confirm `ended_at` gets set and the participation stays visible (not deleted); separately confirm "참가 취소" (leave) still deletes it.

- [ ] **Step 9: Commit**

```bash
git add backend/hackathons/views.py backend/hackathons/urls.py backend/hackathons/tests.py frontend/src/api/index.ts
git commit -m "refactor: collapse participation end into resource PATCH on /participations/<id>/"
```

---

## Self-Review Notes

- **Spec coverage:** "AI 분석을 매번 쓰면 곤란하기 때문에 캐싱도 잘 되어 있는지 확인" → Tasks 1–2 (there was no caching at all before this plan; now there is). "RESTapi 설계 원칙에 따라 잘 설계 되었는지" → Tasks 3–4 fix the one recurring, mechanical violation found (verb-suffixed action URLs duplicating what a resource-level PATCH/DELETE already does); other apps' URL layouts (`hackathons`, `chat`, `notifications`, `reviews`) were audited and don't have this pattern beyond the noted `notifications/read-all/` bulk-action exception, which is scoped out with rationale above.
- **Placeholder scan:** none found — Task 1's migration dependency name is the one deliberately-left variable (`000<N-1>_previous_migration_name`), and Step 2 of that task exists specifically to resolve it before Step 3 is written, per the actual repo state at execution time.
- **Type consistency:** `generate_ai_reasons()` keeps its existing signature and return shape across Task 2, so `matching/views.py` (which calls it) needs no changes — verified by reading `matching/views.py` during planning. `CoffeeChatDetailView`/`ParticipationDetailView` keep the same serializer classes and response shapes as their predecessors, so no frontend type (`frontend/src/types/index.ts`) changes are needed — only the URL/method the frontend calls.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-14-backend-rest-and-ai-caching.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
