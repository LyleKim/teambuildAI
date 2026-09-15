# Role-Based Profile Branching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let non-developer participants (PM/기획, 디자인) get profile fields tailored to their role, via a dedicated role-selection step right after Kakao login, instead of the current one-size-fits-all developer-flavored form.

**Architecture:** `Profile.roles` already stores one or more role tags chosen from `META_OPTIONS.roles` (기획/디자인/백엔드/프론트엔드/AI·ML) — there is no separate "developer" flag anywhere, and no per-role branching data exists yet. This plan adds that branching in two layers:

1. **A role→category map served from `/meta/options/`** (`role_categories`: role tag → `'dev'|'design'|'planning'`, plus `skills_by_role_category`) — this is the shared data both new and existing screens key off of.
2. **A new mandatory onboarding step, `RoleSelectScreen`, shown right after Kakao login** when the user has never picked a role (no `Profile` row yet, or `roles` is empty). It saves just the chosen roles through a new lightweight endpoint (`PATCH /me/profile/role/` — the existing `PUT /me/profile/` can't be used for a partial save because its serializer requires all 5 bio fields), then hands off to the existing `ProfileSetupScreen` to fill in the rest. `ProfileSetupScreen` itself is also updated so its skill-chip options and 5 self-intro question placeholders react to whatever `roles` are already selected (from onboarding, or if the user changes their role tags later) — so the branching keeps working even if someone edits their role after the initial signup.

Returning users (roles already set) skip the new screen entirely and land on the hackathons list exactly as today — this only changes the first-login path.

**Tech Stack:** Django REST Framework (new tiny APIView + extended meta/options), React + TypeScript (new screen + route + one API call), no new dependencies.

**Spec:** No separate spec doc — spec is the user's own priority statement (support role-appropriate profiles for PM/디자인, branch at signup), refined into the above architecture during planning and confirmed with the user (dedicated onboarding step, not just in-form reactivity).

## Global Constraints

- Follow existing code style: Korean UI copy and Korean code comments only where they explain non-obvious *why* (matches current file conventions).
- Frontend has no test runner configured (no vitest/jest, no `*.test.*` files) — do not add one for this change. Frontend tasks are verified via `pnpm typecheck` plus a manual browser check, not automated tests.
- Backend changes are verified with Django's `manage.py test` (TDD: failing test first).
- No validation of `roles` values against `META_OPTIONS['roles']` server-side — the existing `PUT /me/profile/` endpoint doesn't validate this either (it's a free `JSONField`), so the new role-only endpoint matches that existing looseness rather than inventing new enforcement.
- New MetaOptions keys (`role_categories`, `skills_by_role_category`) are additive; the existing flat `skills` key must keep working (used as the fallback list when no role is picked yet).
- Do not change the `Profile` model or add a migration — `roles` already exists and already flows through `matching/scoring.py`/`ai_reason.py` unchanged.

---

## File Structure

- Modify `backend/hackathons/views.py` — add `ROLE_CATEGORIES` / `SKILLS_BY_ROLE_CATEGORY` constants and extend `META_OPTIONS`.
- Modify `backend/hackathons/tests.py` — new test class asserting the extended `/meta/options/` shape.
- Modify `backend/accounts/views.py` — new `MyProfileRoleView` for the onboarding partial-save.
- Modify `backend/accounts/urls.py` — route for the new view.
- Modify `backend/accounts/tests.py` — new test class for the new endpoint.
- Modify `frontend/src/types/index.ts` — extend the `MetaOptions` interface.
- Modify `frontend/src/lib/constants.ts` — extend `DEFAULT_META_OPTIONS` fallback with matching data.
- Modify `frontend/src/api/index.ts` — add `profileApi.setRole()`.
- Create `frontend/src/screens/RoleSelectScreen.tsx` — the new onboarding screen.
- Modify `frontend/src/lib/router.tsx` — add the `onboardingRole` route.
- Modify `frontend/src/App.tsx` — register the new route.
- Modify `frontend/src/screens/AuthCallbackScreen.tsx` — redirect first-time users to the new screen instead of straight to the hackathons list.
- Modify `frontend/src/screens/ProfileSetupScreen.tsx` — replace the single hardcoded `BIO_QUESTIONS` array and the flat skills chip list with role-category-derived versions.

---

### Task 1: Backend — role→category map and bucketed skills in `/meta/options/`

**Files:**
- Modify: `backend/hackathons/views.py:193-207`
- Test: `backend/hackathons/tests.py`

**Interfaces:**
- Produces: `META_OPTIONS['role_categories']: dict[str, str]` (role tag → `'dev'|'design'|'planning'`), `META_OPTIONS['skills_by_role_category']: dict[str, list[str]]`, and `META_OPTIONS['skills']` unchanged in meaning (now computed as the sorted union of all category buckets, still a flat `list[str]`). Consumed by Task 6 (`RoleSelectScreen`) and Task 7 (`ProfileSetupScreen`).

- [ ] **Step 1: Write the failing test**

Add to `backend/hackathons/tests.py` (new class, alongside the existing `TodoItemTests`/`ParticipationEndTests`/`ManualParticipantTests`):

```python
class MetaOptionsTests(APITestCase):
    def test_role_categories_and_bucketed_skills_are_exposed(self):
        res = self.client.get('/api/v1/meta/options/')
        self.assertEqual(res.status_code, 200)

        self.assertEqual(res.data['role_categories']['백엔드'], 'dev')
        self.assertEqual(res.data['role_categories']['프론트엔드'], 'dev')
        self.assertEqual(res.data['role_categories']['AI/ML'], 'dev')
        self.assertEqual(res.data['role_categories']['디자인'], 'design')
        self.assertEqual(res.data['role_categories']['기획'], 'planning')

        self.assertIn('Figma', res.data['skills_by_role_category']['design'])
        self.assertIn('Notion', res.data['skills_by_role_category']['planning'])
        self.assertIn('Django', res.data['skills_by_role_category']['dev'])

        # 하위 호환: 통합 skills 리스트도 여전히 내려간다 (역할 미선택 상태의 폴백용)
        self.assertIn('Django', res.data['skills'])
        self.assertIn('Figma', res.data['skills'])
        self.assertIn('Notion', res.data['skills'])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run python manage.py test hackathons.tests.MetaOptionsTests -v 2`
Expected: FAIL with `KeyError: 'role_categories'`

- [ ] **Step 3: Write minimal implementation**

Replace `backend/hackathons/views.py:193-207` (the `META_OPTIONS` block) with:

```python
# 역할 태그 -> 카테고리. 온보딩 화면(역할 선택)과 프로필 작성 화면이 "대표 역할"
# 선택에 따라 기술스택 선택지와 자기소개 문항 문구를 바꿔 보여주는 데 쓴다
# (개발자 전용이던 문구를 PM/디자인에도 맞춘다).
ROLE_CATEGORIES = {
    '기획': 'planning',
    '디자인': 'design',
    '백엔드': 'dev',
    '프론트엔드': 'dev',
    'AI/ML': 'dev',
}

SKILLS_BY_ROLE_CATEGORY = {
    'dev': ['Django', 'React', 'Python', 'TypeScript', 'Node.js'],
    'design': ['Figma', 'Zeplin', 'Adobe XD', 'Photoshop', 'Illustrator'],
    'planning': ['Notion', 'Jira', 'Google Analytics', 'PRD 작성', 'Miro'],
}

META_OPTIONS = {
    'categories': ['전체', 'AI', '모바일', '클라우드', 'DevOps'],
    'roles': ['기획', '디자인', '백엔드', '프론트엔드', 'AI/ML'],
    'role_categories': ROLE_CATEGORIES,
    'skills_by_role_category': SKILLS_BY_ROLE_CATEGORY,
    # 역할을 아직 안 고른 상태(신규 작성 초반)의 폴백 겸, 과거 프론트 캐시 호환용 통합 리스트.
    'skills': sorted({skill for skills in SKILLS_BY_ROLE_CATEGORY.values() for skill in skills}),
    'available_times': ['평일 저녁', '주말 위주', '주말 올인', '자유'],
    'regions': ['서울', '경기', '온라인'],
    'goals': ['수상 목적', '포트폴리오', '경험'],
    'collaborations': ['오프라인 위주', '온라인 위주', '혼합'],
    'communications': ['직설적 피드백 선호', '부드러운 소통 선호', '상관없음'],
    'interests': ['AI', '핀테크', '헬스케어', '커리어', '소셜'],
    'recruit_statuses': ['모집 중', '매칭 완료', '재모집', '모집 마감', '비공개'],
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose exec backend uv run python manage.py test hackathons.tests.MetaOptionsTests -v 2`
Expected: PASS

- [ ] **Step 5: Run the full hackathons test suite to check for regressions**

Run: `docker compose exec backend uv run python manage.py test hackathons -v 2`
Expected: PASS (no other test reads `META_OPTIONS['skills']` by exact list identity)

- [ ] **Step 6: Commit**

```bash
git add backend/hackathons/views.py backend/hackathons/tests.py
git commit -m "feat: expose role-category-bucketed skills in meta/options"
```

---

### Task 2: Frontend — extend `MetaOptions` type and default fallback

**Files:**
- Modify: `frontend/src/types/index.ts:314-326`
- Modify: `frontend/src/lib/constants.ts:7-18`

**Interfaces:**
- Consumes: nothing new (pure type/data addition).
- Produces: `MetaOptions.role_categories: Record<string, string>`, `MetaOptions.skills_by_role_category: Record<string, string[]>` — consumed by Task 6 and Task 7.

- [ ] **Step 1: Extend the type**

Replace `frontend/src/types/index.ts:314-326`:

```ts
// ─── 선택지 메타 ──────────────────────────────────────────────────────────────

/** 칩/셀렉트 선택지를 서버에서 관리하기 위한 응답 */
export interface MetaOptions {
  categories: string[]
  roles: string[]
  /** 역할 태그(roles의 각 값) -> 'dev' | 'design' | 'planning' 카테고리 */
  role_categories: Record<string, string>
  /** 카테고리별 기술스택 선택지. 역할 미선택 시 skills(통합 리스트)로 폴백한다 */
  skills_by_role_category: Record<string, string[]>
  skills: string[]
  available_times: string[]
  regions: string[]
  goals: string[]
  collaborations: string[]
  communications: string[]
  interests: string[]
  recruit_statuses: string[]
}
```

- [ ] **Step 2: Extend the default fallback**

Replace `frontend/src/lib/constants.ts:7-18`:

```ts
export const DEFAULT_META_OPTIONS: MetaOptions = {
  categories: ['전체', 'AI', '모바일', '클라우드', 'DevOps'],
  roles: ['기획', '디자인', '백엔드', '프론트엔드', 'AI/ML'],
  role_categories: {
    기획: 'planning',
    디자인: 'design',
    백엔드: 'dev',
    프론트엔드: 'dev',
    'AI/ML': 'dev',
  },
  skills_by_role_category: {
    dev: ['Django', 'React', 'Python', 'TypeScript', 'Node.js'],
    design: ['Figma', 'Zeplin', 'Adobe XD', 'Photoshop', 'Illustrator'],
    planning: ['Notion', 'Jira', 'Google Analytics', 'PRD 작성', 'Miro'],
  },
  skills: ['Django', 'React', 'Figma', 'Python', 'TypeScript', 'Node.js'],
  available_times: ['평일 저녁', '주말 위주', '주말 올인', '자유'],
  regions: ['서울', '경기', '온라인'],
  goals: ['수상 목적', '포트폴리오', '경험'],
  collaborations: ['오프라인 위주', '온라인 위주', '혼합'],
  communications: ['직설적 피드백 선호', '부드러운 소통 선호', '상관없음'],
  interests: ['AI', '핀테크', '헬스케어', '커리어', '소셜'],
  recruit_statuses: ['모집 중', '매칭 완료', '재모집', '모집 마감', '비공개'],
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS (no consumer of `MetaOptions` breaks — `role_categories`/`skills_by_role_category` are additive)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/constants.ts
git commit -m "feat: add role-category fields to MetaOptions type and default"
```

---

### Task 3: Backend — lightweight role-only save endpoint for onboarding

**Files:**
- Modify: `backend/accounts/views.py`
- Modify: `backend/accounts/urls.py`
- Modify: `backend/accounts/tests.py`

**Interfaces:**
- Produces: `PATCH /api/v1/me/profile/role/` — body `{"roles": ["백엔드", ...]}` (non-empty list of strings), response `{"roles": [...]}`. Consumed by Task 6 (`RoleSelectScreen`).

- [ ] **Step 1: Write the failing test**

In `backend/accounts/tests.py`, change the top import line from:

```python
from .models import User
```

to:

```python
from .models import Profile, User
```

Then add a new test class:

```python
class MyProfileRoleTests(APITestCase):
    """온보딩(역할 선택) 단계에서 쓰는 부분 저장 엔드포인트.

    PUT /me/profile/ 은 자기소개 5개 필드가 전부 필수라 이 시점엔 못 쓴다 —
    역할만 먼저 저장하고 나머지는 다음 화면(ProfileSetupScreen)에서 채운다.
    """

    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.client.force_authenticate(self.me)

    def test_saves_roles_and_creates_profile_if_missing(self):
        res = self.client.patch('/api/v1/me/profile/role/', {'roles': ['디자인']}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['roles'], ['디자인'])
        self.assertEqual(Profile.objects.get(user=self.me).roles, ['디자인'])

    def test_updates_roles_on_existing_profile(self):
        Profile.objects.create(user=self.me, roles=['백엔드'])
        res = self.client.patch('/api/v1/me/profile/role/', {'roles': ['프론트엔드', 'AI/ML']}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Profile.objects.get(user=self.me).roles, ['프론트엔드', 'AI/ML'])

    def test_rejects_empty_roles(self):
        res = self.client.patch('/api/v1/me/profile/role/', {'roles': []}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_rejects_missing_roles(self):
        res = self.client.patch('/api/v1/me/profile/role/', {}, format='json')
        self.assertEqual(res.status_code, 400)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend uv run python manage.py test accounts.tests.MyProfileRoleTests -v 2`
Expected: FAIL with 404 (no such URL yet)

- [ ] **Step 3: Add the view**

In `backend/accounts/views.py`, add after `MyProfilePrivacyView`:

```python
class MyProfileRoleView(APIView):
    """온보딩(카카오 로그인 직후 역할 선택) 단계에서 역할만 먼저 저장한다.

    MyProfileView(PUT)은 자기소개 5개 필드가 전부 필수라 이 시점엔 쓸 수 없어서
    가벼운 전용 엔드포인트를 둔다. roles 값 자체는 PUT /me/profile/ 과 동일하게
    검증하지 않는다 (원래도 자유 JSONField라 선택지 목록 대조를 하지 않았다).
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        roles = request.data.get('roles')
        if not isinstance(roles, list) or not roles or not all(isinstance(r, str) for r in roles):
            raise ValidationError({'roles': '역할을 최소 1개 선택해주세요.'})

        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.roles = roles
        profile.save(update_fields=['roles'])
        return Response({'roles': profile.roles})
```

- [ ] **Step 4: Wire the URL**

In `backend/accounts/urls.py`, add a line after `path('me/profile/privacy/', views.MyProfilePrivacyView.as_view()),`:

```python
    path('me/profile/role/', views.MyProfileRoleView.as_view()),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose exec backend uv run python manage.py test accounts -v 2`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/accounts/views.py backend/accounts/urls.py backend/accounts/tests.py
git commit -m "feat: add lightweight role-only profile save endpoint for onboarding"
```

---

### Task 4: Frontend — routing plumbing for the new onboarding screen

**Files:**
- Modify: `frontend/src/lib/router.tsx`
- Modify: `frontend/src/api/index.ts:110-126`

**Interfaces:**
- Produces: `routes.onboardingRole: '/onboarding/role'`, `profileApi.setRole(roles: string[]): Promise<{ roles: string[] }>`. Consumed by Task 5 (App.tsx), Task 6 (RoleSelectScreen), Task 7 (AuthCallbackScreen).

- [ ] **Step 1: Add the route constant**

In `frontend/src/lib/router.tsx`, in the `routes` object, add a line after `authCallback: '/auth/callback',`:

```ts
  /** 카카오 로그인 직후, 역할을 한 번도 고른 적 없는 사용자에게 보여주는 온보딩 화면 */
  onboardingRole: '/onboarding/role',
```

- [ ] **Step 2: Add the API call**

Replace `frontend/src/api/index.ts:110-126`:

```ts
export const profileApi = {
  mine() {
    return api.get<MyProfile>('/me/profile/')
  },

  save(input: ProfileInput) {
    return api.put<MyProfile>('/me/profile/', input)
  },

  /** 온보딩(역할 선택) 화면 전용 — 자기소개 등 나머지 필드 없이 roles만 저장한다 */
  setRole(roles: string[]) {
    return api.patch<{ roles: string[] }>('/me/profile/role/', { roles })
  },

  setPrivate(isPrivate: boolean) {
    return api.patch<{ is_private: boolean }>('/me/profile/privacy/', { is_private: isPrivate })
  },

  member(userId: number) {
    return api.get<MemberProfile>(`/users/${userId}/profile/`)
  },
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/router.tsx frontend/src/api/index.ts
git commit -m "feat: add onboarding route and profileApi.setRole"
```

---

### Task 5: Frontend — the `RoleSelectScreen` itself

**Files:**
- Create: `frontend/src/screens/RoleSelectScreen.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useMetaOptions()` → `options.roles`, `options.role_categories` (Task 1/2); `profileApi.setRole()` (Task 4); `useMutation` (existing hook, same shape used by `ProfileSetupScreen`: `{ mutate, loading, error }`).
- Produces: renders at `routes.onboardingRole`; on success navigates to `routes.profile` (existing `ProfileSetupScreen`, which Task 7 will make aware of the just-picked category).

- [ ] **Step 1: Write the screen**

Create `frontend/src/screens/RoleSelectScreen.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { profileApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ChipGroup, InlineError, PrimaryButton } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useMutation } from '@/hooks/useMutation'
import { routes, useNavigate } from '@/lib/router'

type RoleCategory = 'dev' | 'design' | 'planning'

const CATEGORY_ORDER: RoleCategory[] = ['dev', 'design', 'planning']
const CATEGORY_LABELS: Record<RoleCategory, string> = {
  dev: '개발',
  design: '디자인',
  planning: '기획',
}

/**
 * 카카오 로그인 직후, 프로필을 한 번도 작성한 적 없는 사용자에게 보여주는 온보딩 화면.
 * 여기서 고른 roles는 그대로 Profile.roles에 저장되고, 이후 프로필 작성 화면
 * (ProfileSetupScreen)이 이 값으로 기술스택/자기소개 문항을 역할에 맞게 갈라 보여준다.
 */
export function RoleSelectScreen() {
  const navigate = useNavigate()
  const { options } = useMetaOptions()
  const [category, setCategory] = useState<RoleCategory | null>(null)
  const [roles, setRoles] = useState<string[]>([])

  const rolesInCategory = useMemo(
    () => options.roles.filter((role) => options.role_categories[role] === category),
    [options, category],
  )

  const save = useMutation(
    async (selected: string[]) => {
      await profileApi.setRole(selected)
    },
    { onSuccess: () => navigate(routes.profile, { replace: true }) },
  )

  const selectedCategoryLabel = category ? [CATEGORY_LABELS[category]] : []

  return (
    <Page>
      <h1 className="text-[20px] font-bold text-gray-800">어떤 역할로 참여하시나요?</h1>
      <p className="text-[13px] text-[#8FA3BF] mt-1 mb-8">
        선택한 역할에 맞춰 다음 프로필 작성 화면의 질문이 달라져요
      </p>

      <ChipGroup
        label="분야"
        options={CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c])}
        selected={selectedCategoryLabel}
        onChange={(v) => {
          const picked = CATEGORY_ORDER.find((c) => CATEGORY_LABELS[c] === v[0]) ?? null
          setCategory(picked)
          setRoles([])
        }}
        multi={false}
      />

      {category && (
        <ChipGroup label="세부 역할" options={rolesInCategory} selected={roles} onChange={setRoles} />
      )}

      <InlineError message={save.error?.message} />
      <PrimaryButton
        onClick={() => save.mutate(roles)}
        loading={save.loading}
        disabled={roles.length === 0}
        className="w-full mt-4"
      >
        다음
      </PrimaryButton>
    </Page>
  )
}
```

- [ ] **Step 2: Register the route**

In `frontend/src/App.tsx`, add the import alongside the other screen imports:

```tsx
import { RoleSelectScreen } from '@/screens/RoleSelectScreen'
```

Add the route entry right after the `/auth/callback` line in `ROUTE_TABLE`:

```tsx
  { pattern: '/onboarding/role', value: { render: () => <RoleSelectScreen />, auth: true } },
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/screens/RoleSelectScreen.tsx frontend/src/App.tsx
git commit -m "feat: add role selection onboarding screen"
```

---

### Task 6: Frontend — redirect first-time users into onboarding after Kakao login

**Files:**
- Modify: `frontend/src/screens/AuthCallbackScreen.tsx`

**Interfaces:**
- Consumes: `profileApi.mine()`, `ApiError` (from `@/api`), `routes.onboardingRole` (Task 4).

- [ ] **Step 1: Replace the post-login redirect logic**

Replace `frontend/src/screens/AuthCallbackScreen.tsx:1-56`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { ApiError, authApi, profileApi } from '@/api'
import { LoadingState } from '@/components/states'
import { useSession } from '@/context/SessionContext'
import { routes, useLocation, useNavigate } from '@/lib/router'

/**
 * 카카오 로그인 콜백 처리 화면.
 *
 * Django가 두 방식 중 하나로 돌려보낼 수 있고, 둘 다 지원한다.
 *  1) `#/auth/callback?access=...&refresh=...`  — 서버가 토큰까지 발급해서 전달
 *  2) `#/auth/callback?code=...&state=...`      — 인가 코드만 전달, 프론트가 교환 요청
 */
export function AuthCallbackScreen() {
  const { query } = useLocation()
  const navigate = useNavigate()
  const { signIn } = useSession()
  const [error, setError] = useState<string | null>(null)

  // StrictMode의 이중 실행으로 인가 코드가 두 번 소비되는 것을 막는다
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const run = async () => {
      const access = query.get('access')
      const refresh = query.get('refresh')
      const code = query.get('code')
      const failure = query.get('error')

      if (failure) {
        setError(query.get('error_description') || '카카오 로그인이 취소되었어요.')
        return
      }

      try {
        if (access) {
          await signIn(access, refresh ?? undefined)
        } else if (code) {
          const tokens = await authApi.exchangeCode(code, query.get('state') ?? undefined)
          await signIn(tokens.access, tokens.refresh)
        } else {
          setError('로그인 정보가 전달되지 않았어요.')
          return
        }

        // 역할을 한 번도 고른 적 없는 사용자(프로필 없음 = 404, 또는 roles가 비어있음)는
        // 온보딩(역할 선택) 화면으로, 이미 골랐으면 바로 홈으로 보낸다.
        try {
          const profile = await profileApi.mine()
          navigate(profile.roles.length > 0 ? routes.hackathons : routes.onboardingRole, { replace: true })
        } catch (profileErr) {
          if (profileErr instanceof ApiError && profileErr.status === 404) {
            navigate(routes.onboardingRole, { replace: true })
          } else {
            throw profileErr
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '로그인 처리 중 문제가 발생했어요.')
      }
    }

    void run()
  }, [query, signIn, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-[#EEF4FB] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[17px] font-bold text-[#0F172A]">로그인에 실패했어요</p>
        <p className="text-[13px] text-[#64748B] max-w-sm">{error}</p>
        <button
          onClick={() => navigate(routes.login, { replace: true })}
          className="mt-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[14px] px-8 py-3 rounded-xl transition-colors"
        >
          다시 로그인하기
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EEF4FB] flex items-center justify-center">
      <LoadingState label="로그인 중이에요…" />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Manual verification**

1. `docker compose up -d` then from `frontend/`: `pnpm dev`.
2. Delete any existing `Profile` row for a test account (or use a brand-new Kakao test account / DB user) so `GET /me/profile/` 404s.
3. Log in with that account → confirm you land on `#/onboarding/role`, not `#/hackathons`.
4. Pick "디자인" category → confirm the "세부 역할" chips show only 디자인, pick it, click "다음" → confirm you land on `#/profile` (ProfileSetupScreen) with 디자인 pre-selected as the 대표 역할.
5. Log out, log back in with the same account → confirm you now land directly on `#/hackathons` (role already set, onboarding skipped).
6. For an account that already had a profile before this change shipped, confirm login still goes straight to `#/hackathons` (no regression for existing users).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/screens/AuthCallbackScreen.tsx
git commit -m "feat: route first-time users through role onboarding after login"
```

---

### Task 7: Frontend — branch skill options and bio-question copy by role category in `ProfileSetupScreen`

**Files:**
- Modify: `frontend/src/screens/ProfileSetupScreen.tsx`

**Interfaces:**
- Consumes: `MetaOptions.role_categories`, `MetaOptions.skills_by_role_category` (Task 1/2); `form.roles`, which by the time this screen is reached from onboarding is already pre-populated with the roles saved in Task 6's flow (via `profileApi.mine()` returning what Task 3's endpoint just wrote).
- Produces: nothing consumed elsewhere — this is a leaf screen.

- [ ] **Step 1: Replace the single `BIO_QUESTIONS` constant with per-category question sets**

Replace `frontend/src/screens/ProfileSetupScreen.tsx:1-21`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { profileApi, recommendationApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { ChipGroup, InlineError, PrimaryButton, Toggle } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { LINK_META } from '@/lib/constants'
import { toArray, toSingle } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'
import { LINK_TYPES } from '@/types'
import type { LinkType, PortfolioLink, ProfileInput } from '@/types'

type RoleCategory = 'dev' | 'design' | 'planning'
const DEFAULT_CATEGORY: RoleCategory = 'dev'

type BioQuestion = { key: keyof Pick<ProfileInput, 'bio_style' | 'bio_strength' | 'bio_experience' | 'bio_goal' | 'bio_contribution'>; label: string; placeholder: string }

// 역할 카테고리별 자기소개 문항. 이전엔 개발자 예시로만 고정돼 있었다 —
// PM(기획)/디자인도 자기 역할에 맞는 예시를 보도록 카테고리별로 나눈다.
const BIO_QUESTIONS_BY_CATEGORY: Record<RoleCategory, BioQuestion[]> = {
  dev: [
    { key: 'bio_style', label: '저는 이런 사람이에요', placeholder: '차분하게 문제를 뜯어보는 편이고, 마감은 꼭 지켜요' },
    { key: 'bio_strength', label: '이런 걸 잘해요', placeholder: 'REST API 설계와 DB 최적화에 자신 있어요' },
    { key: 'bio_experience', label: '이런 경험이 있어요', placeholder: '교내 해커톤 2회 참가, 사이드 프로젝트로 예약 서비스 개발' },
    { key: 'bio_goal', label: '이번 해커톤에서 이걸 하고 싶어요', placeholder: '결제 기능을 처음부터 끝까지 구현해보고 싶어요' },
    { key: 'bio_contribution', label: '팀에 이렇게 기여할 수 있어요', placeholder: '백엔드 전반을 책임지고, 배포까지 맡을 수 있어요' },
  ],
  design: [
    { key: 'bio_style', label: '저는 이런 사람이에요', placeholder: '섬세하게 디테일을 챙기는 편이고, 사용자 입장에서 먼저 생각해요' },
    { key: 'bio_strength', label: '이런 걸 잘해요', placeholder: 'UI/UX 리서치와 프로토타이핑에 자신 있어요' },
    { key: 'bio_experience', label: '이런 경험이 있어요', placeholder: '교내 공모전 2회 참가, 사이드 프로젝트 앱 UI 리디자인' },
    { key: 'bio_goal', label: '이번 해커톤에서 이걸 하고 싶어요', placeholder: '처음부터 끝까지 디자인 시스템을 구축해보고 싶어요' },
    { key: 'bio_contribution', label: '팀에 이렇게 기여할 수 있어요', placeholder: '전체 화면 디자인과 프로토타입 제작을 책임질 수 있어요' },
  ],
  planning: [
    { key: 'bio_style', label: '저는 이런 사람이에요', placeholder: '일정과 우선순위를 꼼꼼히 챙기는 편이고, 소통을 중요하게 생각해요' },
    { key: 'bio_strength', label: '이런 걸 잘해요', placeholder: '요구사항 정리와 일정 관리, 팀 커뮤니케이션에 자신 있어요' },
    { key: 'bio_experience', label: '이런 경험이 있어요', placeholder: '교내 해커톤 2회 기획 참여, 서비스 기획서 작성 경험' },
    { key: 'bio_goal', label: '이번 해커톤에서 이걸 하고 싶어요', placeholder: '아이디어를 실제 서비스로 만들어보는 전 과정을 이끌어보고 싶어요' },
    { key: 'bio_contribution', label: '팀에 이렇게 기여할 수 있어요', placeholder: '기획서 작성부터 일정 관리, 팀 커뮤니케이션 전반을 맡을 수 있어요' },
  ],
}

const ONE_LINER_PLACEHOLDER_BY_CATEGORY: Record<RoleCategory, string> = {
  dev: '예: 백엔드로 빠르게 만들고 검증하는 걸 좋아합니다',
  design: '예: 사용자가 느끼는 디테일까지 고민하는 걸 좋아합니다',
  planning: '예: 아이디어를 구조화하고 팀을 이끄는 걸 좋아합니다',
}
```

- [ ] **Step 2: Derive active categories, skill options, and bio questions from the selected roles**

In the component body, replace:

```tsx
export function ProfileSetupScreen({ hackathonId }: { hackathonId: number | null }) {
  const navigate = useNavigate()
  const { options } = useMetaOptions()

  const { data, loading, error, refetch } = useQuery('me:profile', () => profileApi.mine())
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE)
  const [bioOpen, setBioOpen] = useState(true)
```

with:

```tsx
export function ProfileSetupScreen({ hackathonId }: { hackathonId: number | null }) {
  const navigate = useNavigate()
  const { options } = useMetaOptions()

  const { data, loading, error, refetch } = useQuery('me:profile', () => profileApi.mine())
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE)
  const [bioOpen, setBioOpen] = useState(true)

  // 대표 역할 선택에 따라 기술스택 선택지와 자기소개 문항을 바꾼다. 온보딩(RoleSelectScreen)에서
  // 이미 골라둔 roles가 여기 폼에 그대로 반영돼 들어오므로, 로그인 직후 흐름에서도 처음부터
  // 역할에 맞는 내용이 보인다. 역할을 여러 카테고리에 걸쳐 골랐으면 기술스택은 합쳐서 보여준다.
  const activeCategories = useMemo(() => {
    const cats = form.roles
      .map((role) => options.role_categories[role] as RoleCategory | undefined)
      .filter((c): c is RoleCategory => c != null)
    return cats.length > 0 ? Array.from(new Set(cats)) : [DEFAULT_CATEGORY]
  }, [form.roles, options.role_categories])

  const primaryCategory = activeCategories[0]

  const skillOptions = useMemo(() => {
    const bucketed = activeCategories.flatMap((c) => options.skills_by_role_category[c] ?? [])
    return bucketed.length > 0 ? Array.from(new Set(bucketed)) : options.skills
  }, [activeCategories, options])

  const bioQuestions = BIO_QUESTIONS_BY_CATEGORY[primaryCategory]
```

- [ ] **Step 3: Wire the derived values into the render**

Replace the "기술 스택" chip group (`frontend/src/screens/ProfileSetupScreen.tsx:122`):

```tsx
      <ChipGroup label="기술 스택" options={skillOptions} selected={form.skills} onChange={(v) => set('skills', v)} />
```

Replace the one-liner input's `placeholder` prop (`frontend/src/screens/ProfileSetupScreen.tsx:187`):

```tsx
          placeholder={ONE_LINER_PLACEHOLDER_BY_CATEGORY[primaryCategory]}
```

Replace the `bioComplete` computed value and the bio question map, both currently referencing the module-level `BIO_QUESTIONS` (`frontend/src/screens/ProfileSetupScreen.tsx:93` and `:218`):

```tsx
  const bioComplete = bioQuestions.every((q) => form[q.key].trim().length > 0)
```

```tsx
            {bioQuestions.map((q, idx) => (
              <div key={q.key} className={idx < bioQuestions.length - 1 ? 'border-b border-[#F1F5F9]' : ''}>
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Manual verification (no frontend test runner exists — verify in the browser)**

1. With the dev server running, open the profile setup screen directly (마이페이지 → 프로필 작성/수정) for an account that already has roles set.
2. Change 대표 역할 to only "디자인" → confirm 기술 스택 chips switch to `Figma/Zeplin/Adobe XD/Photoshop/Illustrator`, the 5 자기소개 placeholders switch to the design-flavored copy, and the 한 줄 자기소개 placeholder switches too.
3. Change to only "기획" → confirm the planning-flavored skills/copy show instead.
4. Change to "백엔드" (or clear all roles) → confirm it falls back to the original dev-flavored copy/skills (no regression for existing developer users).
5. Save the profile (`PUT /me/profile/`) and confirm it still succeeds — the payload shape (`roles`, `skills`, `bio_*`, etc.) is unchanged, so no backend serializer changes were needed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/screens/ProfileSetupScreen.tsx
git commit -m "feat: branch skill options and bio question copy by role category"
```

---

## Self-Review Notes

- **Spec coverage:** "PM/디자인도 각자에 맞는 프로필을 작성할 수 있도록" → Task 7 (role-tailored skills + bio copy). "회원가입 시 역할에 따른 분기가 필요" → Tasks 3–6 add the dedicated post-login role-selection step the user confirmed they want, with Task 3's endpoint existing specifically because the full-profile endpoint can't do a partial save.
- **Placeholder scan:** none found — every string, key, and code block above is the literal content to write.
- **Type consistency:** `RoleCategory` is defined independently (as a local type) in both `RoleSelectScreen.tsx` (Task 6) and `ProfileSetupScreen.tsx` (Task 7) with the same three literal values (`'dev' | 'design' | 'planning'`), matching the string values backend Task 1 puts in `META_OPTIONS['role_categories']`/`SKILLS_BY_ROLE_CATEGORY`. `profileApi.setRole()` (Task 4) returns `{ roles: string[] }`, matching exactly what `MyProfileRoleView.patch()` (Task 3) returns. `RoleSelectScreen` navigates to `routes.profile` (Task 4/6), which is the existing `ProfileSetupScreen` route (`App.tsx:68`) — confirmed that route re-fetches `profileApi.mine()` on mount (`ProfileSetupScreen.tsx`'s existing `useQuery('me:profile', ...)`), so the roles just saved by `RoleSelectScreen` do flow into Task 7's `form.roles` without any extra plumbing.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-14-role-based-profile-branching.md`. Proceeding with **Subagent-Driven execution** per your choice — dispatching a fresh subagent per task, reviewing between tasks.
