# 직군별 포트폴리오 프로필 페이지 구현 계획

> **에이전트 실행 시:** 이 계획을 실행할 때는 superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans 스킬을 사용해 태스크 단위로 진행한다. 체크박스(`- [ ]`)로 진행 상황을 추적한다.

**목표:** 개발자/디자이너/기획자 프로필의 "작성 화면"과 "공개 화면"을 각각 직군에 맞는 서로 다른 구조(포트폴리오처럼)로 재구성한다.

**아키텍처:** `ProfileSetupScreen`(작성)과 `MemberProfileScreen`(공개)은 얇은 디스패처로 남고, 공통 UI(아바타/이름, 저장 버튼, 로딩/에러, 커피챗 CTA 등)는 그대로 부모가 그린다. 직군별로 달라지는 "본문"만 6개의 새 컴포넌트(`DevProfileForm`/`DesignProfileForm`/`PlanningProfileForm`, `DevProfileView`/`DesignProfileView`/`PlanningProfileView`)로 분리해 `frontend/src/screens/profile/` 아래 둔다. 카테고리 판정·기술스택 선택지·자기소개 문항 계산은 새 공용 훅 `useProfileCategory`로 한 곳에 모은다(기존에 `ProfileSetupScreen.tsx`에 인라인돼 있던 로직을 뽑아낸 것). 새 DB 필드나 마이그레이션은 없다 — 기존 `Profile` 필드를 재배치할 뿐이다.

**스펙:** `docs/superpowers/specs/2026-09-15-job-category-profile-pages-design.md`

## 전역 제약사항

- **커밋은 하지 않는다.** 이 계획을 실행하는 에이전트(구현자)는 어떤 단계에서도 `git commit`을 실행하지 않는다 — 변경된 파일은 워킹 트리에 그대로 두고, 커밋은 100% 사용자가 직접 한다. 각 태스크의 "커밋" 단계는 "변경 파일 확인" 단계로 대체한다.
- 프론트엔드에는 자동 테스트 러너가 없다(기존 관례) — 검증은 `pnpm typecheck` 통과로 한다.
- 새 `Profile` 모델 필드나 마이그레이션을 추가하지 않는다 — 기존 필드(`roles`, `skills`, `one_liner`, `bio_*` 5개, `links`, `available_time`, `goal`, `collaboration`, `communication`, `interests`, `open_chat`, `phone`, `is_private`)만 사용한다.
- 카테고리는 기존 3개(`dev`/`design`/`planning`)를 그대로 쓴다. 새 카테고리를 추가하지 않는다.
- 기존 코드 스타일을 따른다: 한국어 UI 문구, 비자명한 이유를 설명할 때만 한국어 코드 주석.

---

## 파일 구조

- 신규: `frontend/src/lib/profileCategoryContent.ts` — `RoleCategory`/`BioQuestion` 타입, `DEFAULT_CATEGORY`, `BIO_QUESTIONS_BY_CATEGORY`, `ONE_LINER_PLACEHOLDER_BY_CATEGORY` (기존 `ProfileSetupScreen.tsx`에서 이동)
- 신규: `frontend/src/hooks/useProfileCategory.ts` — 공용 카테고리 판정 훅
- 신규: `frontend/src/screens/profile/types.ts` — `ProfileFormProps`, `ProfileViewProps`
- 신규: `frontend/src/screens/profile/BioAccordionField.tsx`, `PortfolioLinksField.tsx` — 작성 화면 공용 필드
- 신규: `frontend/src/screens/profile/DevProfileForm.tsx`, `DesignProfileForm.tsx`, `PlanningProfileForm.tsx`
- 신규: `frontend/src/screens/profile/BioItemsView.tsx`, `LinksView.tsx` — 공개 화면 공용 필드
- 신규: `frontend/src/screens/profile/DevProfileView.tsx`, `DesignProfileView.tsx`, `PlanningProfileView.tsx`
- 수정: `frontend/src/screens/ProfileSetupScreen.tsx` (디스패처화)
- 수정: `frontend/src/screens/MemberProfileScreen.tsx` (디스패처화)

백엔드 파일은 이 계획에서 변경하지 않는다.

---

### 태스크 1: 카테고리 콘텐츠 모듈 생성

**파일:**
- 신규: `frontend/src/lib/profileCategoryContent.ts`
- 수정: `frontend/src/screens/ProfileSetupScreen.tsx` (해당 상수 블록 삭제는 태스크 5에서 파일 전체 교체 시 함께 처리 — 이 태스크에서는 신규 파일만 만든다)

**인터페이스:**
- 산출물: `RoleCategory`, `BioQuestion` 타입, `DEFAULT_CATEGORY`, `BIO_QUESTIONS_BY_CATEGORY`, `ONE_LINER_PLACEHOLDER_BY_CATEGORY` — 태스크 2(훅), 태스크 3~4(작성 컴포넌트), 태스크 6~7(공개 컴포넌트)에서 소비.

- [ ] **1단계: 파일 작성**

`frontend/src/lib/profileCategoryContent.ts`를 새로 만든다 (기존 `ProfileSetupScreen.tsx`의 15~50행 내용을 그대로 옮기되, `planning` 카테고리의 `bio_goal`/`bio_contribution`을 앞으로 재배치해 "참여 목표·기여 방식을 우선 어필"하도록 순서만 바꾼다):

```ts
import type { ProfileInput } from '@/types'

export type RoleCategory = 'dev' | 'design' | 'planning'
export const DEFAULT_CATEGORY: RoleCategory = 'dev'

export type BioQuestion = {
  key: keyof Pick<ProfileInput, 'bio_style' | 'bio_strength' | 'bio_experience' | 'bio_goal' | 'bio_contribution'>
  label: string
  placeholder: string
}

// 역할 카테고리별 자기소개 문항. ProfileSetupScreen(작성)과 MemberProfileScreen(공개)
// 양쪽에서 같은 라벨을 쓰기 위해 화면 파일이 아니라 여기 공용 모듈에 둔다.
export const BIO_QUESTIONS_BY_CATEGORY: Record<RoleCategory, BioQuestion[]> = {
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
    // 기획자는 목표/기여를 먼저 어필하도록 순서를 바꾼다 (다른 카테고리는 style→strength→experience→goal→contribution 순).
    { key: 'bio_goal', label: '이번 해커톤에서 이걸 하고 싶어요', placeholder: '아이디어를 실제 서비스로 만들어보는 전 과정을 이끌어보고 싶어요' },
    { key: 'bio_contribution', label: '팀에 이렇게 기여할 수 있어요', placeholder: '기획서 작성부터 일정 관리, 팀 커뮤니케이션 전반을 맡을 수 있어요' },
    { key: 'bio_style', label: '저는 이런 사람이에요', placeholder: '일정과 우선순위를 꼼꼼히 챙기는 편이고, 소통을 중요하게 생각해요' },
    { key: 'bio_strength', label: '이런 걸 잘해요', placeholder: '요구사항 정리와 일정 관리, 팀 커뮤니케이션에 자신 있어요' },
    { key: 'bio_experience', label: '이런 경험이 있어요', placeholder: '교내 해커톤 2회 기획 참여, 서비스 기획서 작성 경험' },
  ],
}

export const ONE_LINER_PLACEHOLDER_BY_CATEGORY: Record<RoleCategory, string> = {
  dev: '예: 백엔드로 빠르게 만들고 검증하는 걸 좋아합니다',
  design: '예: 사용자가 느끼는 디테일까지 고민하는 걸 좋아합니다',
  planning: '예: 아이디어를 구조화하고 팀을 이끄는 걸 좋아합니다',
}
```

- [ ] **2단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과 (아직 아무 화면도 이 파일을 import하지 않으므로 기존 화면 동작에는 영향 없음)

- [ ] **3단계: 변경 파일 확인 (커밋은 하지 않음)**

```bash
git status --short
```
`frontend/src/lib/profileCategoryContent.ts`가 새 파일로 표시되는지만 확인한다. 커밋은 진행하지 않는다.

---

### 태스크 2: 공용 카테고리 판정 훅 생성

**파일:**
- 신규: `frontend/src/hooks/useProfileCategory.ts`

**인터페이스:**
- 소비: 태스크 1의 `RoleCategory`, `BioQuestion`, `DEFAULT_CATEGORY`, `BIO_QUESTIONS_BY_CATEGORY`, `ONE_LINER_PLACEHOLDER_BY_CATEGORY`
- 산출물: `useProfileCategory(roles, options, existingSkills?) → { primaryCategory, skillOptions, bioQuestions, oneLinerPlaceholder }` — 태스크 5(`ProfileSetupScreen`), 태스크 8(`MemberProfileScreen`)에서 소비.

- [ ] **1단계: 파일 작성**

`frontend/src/hooks/useProfileCategory.ts`를 새로 만든다 (기존 `ProfileSetupScreen.tsx`의 `activeCategories`/`skillOptions` 계산 로직을 그대로 훅으로 옮긴 것):

```ts
import { useMemo } from 'react'
import { BIO_QUESTIONS_BY_CATEGORY, DEFAULT_CATEGORY, ONE_LINER_PLACEHOLDER_BY_CATEGORY } from '@/lib/profileCategoryContent'
import type { BioQuestion, RoleCategory } from '@/lib/profileCategoryContent'
import type { MetaOptions } from '@/types'

export interface ProfileCategoryResult {
  primaryCategory: RoleCategory
  skillOptions: string[]
  bioQuestions: BioQuestion[]
  oneLinerPlaceholder: string
}

/**
 * roles로부터 대표 카테고리를 판정하고, 그 카테고리에 맞는 기술스택 선택지·
 * 자기소개 문항·한줄소개 placeholder를 계산한다. ProfileSetupScreen(작성)과
 * MemberProfileScreen(공개) 양쪽에서 같은 로직을 쓰기 위해 훅으로 뽑았다.
 *
 * existingSkills(이미 선택된 스킬)를 넘기면 그 값도 항상 선택지에 포함한다 —
 * 다른 카테고리 버킷에 있던 스킬이 안 보이거나 지울 수 없게 되는 걸 막기 위함
 * (작성 화면에서만 의미가 있고, 공개 화면은 안 넘겨도 된다).
 */
export function useProfileCategory(
  roles: string[],
  options: MetaOptions,
  existingSkills: string[] = [],
): ProfileCategoryResult {
  const activeCategories = useMemo(() => {
    const cats = roles
      .map((role) => options.role_categories[role] as RoleCategory | undefined)
      .filter((c): c is RoleCategory => c != null)
    return cats.length > 0 ? Array.from(new Set(cats)) : [DEFAULT_CATEGORY]
  }, [roles, options.role_categories])

  const primaryCategory = activeCategories[0]

  const skillOptions = useMemo(() => {
    const bucketed = activeCategories.flatMap((c) => options.skills_by_role_category[c] ?? [])
    const base = bucketed.length > 0 ? bucketed : options.skills
    return Array.from(new Set([...base, ...existingSkills]))
  }, [activeCategories, options, existingSkills])

  return {
    primaryCategory,
    skillOptions,
    bioQuestions: BIO_QUESTIONS_BY_CATEGORY[primaryCategory],
    oneLinerPlaceholder: ONE_LINER_PLACEHOLDER_BY_CATEGORY[primaryCategory],
  }
}
```

- [ ] **2단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **3단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 새 파일만 확인. 커밋하지 않는다.

---

### 태스크 3: 작성 화면 공용 필드 컴포넌트 + 타입 생성

**파일:**
- 신규: `frontend/src/screens/profile/types.ts`
- 신규: `frontend/src/screens/profile/BioAccordionField.tsx`
- 신규: `frontend/src/screens/profile/PortfolioLinksField.tsx`

**인터페이스:**
- 소비: 태스크 1의 `BioQuestion` 타입
- 산출물: `ProfileFormProps`, `ProfileViewProps` (태스크 4·5·7·8에서 소비), `BioAccordionField`/`PortfolioLinksField` 컴포넌트 (태스크 4에서 소비)

- [ ] **1단계: 공용 타입 파일 작성**

`frontend/src/screens/profile/types.ts`:

```ts
import type { BioQuestion } from '@/lib/profileCategoryContent'
import type { MemberProfile, MetaOptions, PortfolioLink, ProfileInput } from '@/types'

export interface ProfileFormProps {
  form: ProfileInput
  set: <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => void
  options: MetaOptions
  skillOptions: string[]
  bioQuestions: BioQuestion[]
  oneLinerPlaceholder: string
  bioOpen: boolean
  setBioOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
  addLink: () => void
  removeLink: (index: number) => void
  updateLink: (index: number, patch: Partial<PortfolioLink>) => void
}

export interface ProfileViewProps {
  data: MemberProfile
  bioQuestions: BioQuestion[]
}
```

- [ ] **2단계: 자기소개 아코디언 공용 컴포넌트 작성**

`frontend/src/screens/profile/BioAccordionField.tsx` (기존 `ProfileSetupScreen.tsx`의 "상세 자기소개" 블록을 그대로 컴포넌트화):

```tsx
import type { ProfileInput } from '@/types'
import type { BioQuestion } from '@/lib/profileCategoryContent'

/** 상세 자기소개 5개 질문 아코디언. 문항 목록(bioQuestions)만 카테고리별로 다르고 UI는 동일하다. */
export function BioAccordionField({
  form,
  set,
  bioQuestions,
  bioOpen,
  setBioOpen,
}: {
  form: ProfileInput
  set: <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => void
  bioQuestions: BioQuestion[]
  bioOpen: boolean
  setBioOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
}) {
  return (
    <div className="mb-5">
      <button onClick={() => setBioOpen((v) => !v)} className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[#0F172A]">상세 자기소개</p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#64748B"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={`transition-transform ${bioOpen ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <p className="text-[12px] text-[#64748B] mb-3">
        프로필 상세 페이지에 항목별로 표시돼요. 5개 항목 모두 작성해야 저장할 수 있어요.
      </p>

      {bioOpen && (
        <div className="bg-white border border-[#E2EAF4] rounded-2xl overflow-hidden">
          {bioQuestions.map((q, idx) => (
            <div key={q.key} className={idx < bioQuestions.length - 1 ? 'border-b border-[#F1F5F9]' : ''}>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[13px] font-semibold text-[#0F172A]">{q.label}</p>
                  <span className="text-[11px] text-[#F43F5E]">*</span>
                </div>
                <textarea
                  value={form[q.key]}
                  onChange={(e) => set(q.key, e.target.value)}
                  rows={2}
                  placeholder={q.placeholder}
                  className="w-full bg-[#F8FAFC] border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#0EA5E9] focus:bg-white resize-none placeholder-[#94A3B8] transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **3단계: 포트폴리오 링크 편집 공용 컴포넌트 작성**

`frontend/src/screens/profile/PortfolioLinksField.tsx` (기존 "포트폴리오 링크" 블록에서 제목/설명 문구를 뺀 편집 UI만 컴포넌트화 — 제목·강조 스타일은 카테고리별 Form이 감싸면서 정한다):

```tsx
import { LINK_META } from '@/lib/constants'
import { LINK_TYPES } from '@/types'
import type { LinkType, PortfolioLink } from '@/types'

/** 포트폴리오 링크 추가/수정/삭제 UI. */
export function PortfolioLinksField({
  links,
  addLink,
  removeLink,
  updateLink,
}: {
  links: PortfolioLink[]
  addLink: () => void
  removeLink: (index: number) => void
  updateLink: (index: number, patch: Partial<PortfolioLink>) => void
}) {
  return (
    <div>
      <div className="flex flex-col gap-2">
        {links.map((link, i) => {
          const meta = LINK_META[link.type] ?? LINK_META['기타']
          return (
            <div key={i} className="flex items-center gap-2">
              <select
                value={link.type}
                onChange={(e) => updateLink(i, { type: e.target.value as LinkType })}
                className="bg-white border border-[#E2EAF4] rounded-xl px-3 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#0EA5E9] cursor-pointer flex-shrink-0 w-[120px]"
              >
                {LINK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LINK_META[t].icon} {t}
                  </option>
                ))}
              </select>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">
                  {meta.icon}
                </span>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  placeholder="https://"
                  className="w-full bg-white border border-[#E2EAF4] rounded-xl pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-[#0EA5E9] placeholder-[#94A3B8]"
                />
              </div>
              <button
                onClick={() => removeLink(i)}
                aria-label="링크 삭제"
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#FFF1F2] hover:text-[#F43F5E] transition-colors flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={addLink}
        className="mt-2 flex items-center gap-1.5 text-[#0EA5E9] text-[13px] font-medium hover:text-[#0284C7] transition-colors py-1"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 2v10M2 7h10" />
        </svg>
        링크 추가
      </button>
    </div>
  )
}
```

- [ ] **4단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **5단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 새 파일 3개만 확인. 커밋하지 않는다.

---

### 태스크 4: 직군별 작성 화면(Form) 3종 생성

**파일:**
- 신규: `frontend/src/screens/profile/DevProfileForm.tsx`
- 신규: `frontend/src/screens/profile/DesignProfileForm.tsx`
- 신규: `frontend/src/screens/profile/PlanningProfileForm.tsx`

**인터페이스:**
- 소비: 태스크 3의 `ProfileFormProps`, `BioAccordionField`, `PortfolioLinksField`
- 산출물: `DevProfileForm`/`DesignProfileForm`/`PlanningProfileForm` — 태스크 5(`ProfileSetupScreen`)에서 소비

세 파일 모두 같은 모양(props 동일, JSX 배치만 다름)이라 한 태스크로 묶는다.

- [ ] **1단계: 개발자 작성 화면**

`frontend/src/screens/profile/DevProfileForm.tsx` — 기술 스택과 포트폴리오 링크(GitHub 등)를 한 줄 자기소개 바로 아래, 상단에 배치:

```tsx
import { ChipGroup } from '@/components/ui'
import { toArray, toSingle } from '@/lib/format'
import { BioAccordionField } from './BioAccordionField'
import { PortfolioLinksField } from './PortfolioLinksField'
import type { ProfileFormProps } from './types'

/** 개발자(백엔드/프론트엔드/AI-ML) 프로필 작성 화면. */
export function DevProfileForm({
  form,
  set,
  options,
  skillOptions,
  bioQuestions,
  oneLinerPlaceholder,
  bioOpen,
  setBioOpen,
  addLink,
  removeLink,
  updateLink,
}: ProfileFormProps) {
  return (
    <>
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-semibold text-[#0F172A]">한 줄 자기소개</p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-2">추천 카드에 표시되는 짧은 소개 (30자 이내 권장)</p>
        <input
          type="text"
          value={form.one_liner}
          onChange={(e) => set('one_liner', e.target.value)}
          maxLength={50}
          placeholder={oneLinerPlaceholder}
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      <ChipGroup label="기술 스택" options={skillOptions} selected={form.skills} onChange={(v) => set('skills', v)} />

      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">포트폴리오 링크</p>
        <p className="text-[12px] text-[#64748B] mb-3">GitHub, 블로그 등 여러 링크를 등록할 수 있어요.</p>
        <PortfolioLinksField links={form.links} addLink={addLink} removeLink={removeLink} updateLink={updateLink} />
      </div>

      <ChipGroup
        label="활동 가능 시간"
        options={options.available_times}
        selected={toArray(form.available_time)}
        onChange={(v) => set('available_time', toSingle(v))}
        multi={false}
      />
      <ChipGroup label="선호 지역" options={options.regions} selected={form.regions} onChange={(v) => set('regions', v)} />
      <ChipGroup
        label="참여 목표"
        options={options.goals}
        selected={toArray(form.goal)}
        onChange={(v) => set('goal', toSingle(v))}
        multi={false}
      />
      <ChipGroup
        label="협업 방식"
        options={options.collaborations}
        selected={toArray(form.collaboration)}
        onChange={(v) => set('collaboration', toSingle(v))}
        multi={false}
      />

      <div className="mb-6 bg-[#F0F9FF] rounded-2xl border border-[#BAE6FD] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[13px] font-semibold text-[#0F172A]">소통 방식</p>
          <span className="text-[11px] font-semibold text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
            AI 체크포인트 반영
          </span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-3">
          이 항목은 AI 추천 카드의 '체크 포인트' 근거로 사용돼요. 팀원 간 소통 스타일 불일치를 미리 알려드려요.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.communications.map((opt) => (
            <button
              key={opt}
              onClick={() => set('communication', opt)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                form.communication === opt
                  ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                  : 'bg-white text-[#64748B] border-[#E2EAF4] hover:border-[#0EA5E9]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <ChipGroup label="관심 분야" options={options.interests} selected={form.interests} onChange={(v) => set('interests', v)} />

      <BioAccordionField form={form} set={set} bioQuestions={bioQuestions} bioOpen={bioOpen} setBioOpen={setBioOpen} />
    </>
  )
}
```

- [ ] **2단계: 디자이너 작성 화면**

`frontend/src/screens/profile/DesignProfileForm.tsx` — 포트폴리오 링크(Behance/Instagram 등)를 최상단에 강조 배치, 기술 스택 라벨은 "사용 툴"로 표현:

```tsx
import { ChipGroup } from '@/components/ui'
import { toArray, toSingle } from '@/lib/format'
import { BioAccordionField } from './BioAccordionField'
import { PortfolioLinksField } from './PortfolioLinksField'
import type { ProfileFormProps } from './types'

/** 디자이너 프로필 작성 화면. */
export function DesignProfileForm({
  form,
  set,
  options,
  skillOptions,
  bioQuestions,
  oneLinerPlaceholder,
  bioOpen,
  setBioOpen,
  addLink,
  removeLink,
  updateLink,
}: ProfileFormProps) {
  return (
    <>
      <div className="mb-5 bg-[#FDF2F8] rounded-2xl border border-[#FBCFE8] p-4">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">포트폴리오 링크</p>
        <p className="text-[12px] text-[#64748B] mb-3">Behance, Instagram, Notion 등 작업물 링크를 등록해주세요.</p>
        <PortfolioLinksField links={form.links} addLink={addLink} removeLink={removeLink} updateLink={updateLink} />
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-semibold text-[#0F172A]">한 줄 자기소개</p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-2">추천 카드에 표시되는 짧은 소개 (30자 이내 권장)</p>
        <input
          type="text"
          value={form.one_liner}
          onChange={(e) => set('one_liner', e.target.value)}
          maxLength={50}
          placeholder={oneLinerPlaceholder}
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      <ChipGroup label="사용 툴" options={skillOptions} selected={form.skills} onChange={(v) => set('skills', v)} />

      <ChipGroup
        label="활동 가능 시간"
        options={options.available_times}
        selected={toArray(form.available_time)}
        onChange={(v) => set('available_time', toSingle(v))}
        multi={false}
      />
      <ChipGroup label="선호 지역" options={options.regions} selected={form.regions} onChange={(v) => set('regions', v)} />
      <ChipGroup
        label="참여 목표"
        options={options.goals}
        selected={toArray(form.goal)}
        onChange={(v) => set('goal', toSingle(v))}
        multi={false}
      />
      <ChipGroup
        label="협업 방식"
        options={options.collaborations}
        selected={toArray(form.collaboration)}
        onChange={(v) => set('collaboration', toSingle(v))}
        multi={false}
      />

      <div className="mb-6 bg-[#F0F9FF] rounded-2xl border border-[#BAE6FD] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[13px] font-semibold text-[#0F172A]">소통 방식</p>
          <span className="text-[11px] font-semibold text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
            AI 체크포인트 반영
          </span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-3">
          이 항목은 AI 추천 카드의 '체크 포인트' 근거로 사용돼요. 팀원 간 소통 스타일 불일치를 미리 알려드려요.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.communications.map((opt) => (
            <button
              key={opt}
              onClick={() => set('communication', opt)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                form.communication === opt
                  ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                  : 'bg-white text-[#64748B] border-[#E2EAF4] hover:border-[#0EA5E9]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <ChipGroup label="관심 분야" options={options.interests} selected={form.interests} onChange={(v) => set('interests', v)} />

      <BioAccordionField form={form} set={set} bioQuestions={bioQuestions} bioOpen={bioOpen} setBioOpen={setBioOpen} />
    </>
  )
}
```

- [ ] **3단계: 기획자 작성 화면**

`frontend/src/screens/profile/PlanningProfileForm.tsx` — 참여 목표·협업 방식을 "이 프로젝트에서 원하는 것"으로 묶어 상단에 강조하고, 자기소개를 그다음, 기술 스택은 맨 아래로:

```tsx
import { ChipGroup } from '@/components/ui'
import { toArray, toSingle } from '@/lib/format'
import { BioAccordionField } from './BioAccordionField'
import { PortfolioLinksField } from './PortfolioLinksField'
import type { ProfileFormProps } from './types'

/** 기획자 프로필 작성 화면. */
export function PlanningProfileForm({
  form,
  set,
  options,
  skillOptions,
  bioQuestions,
  oneLinerPlaceholder,
  bioOpen,
  setBioOpen,
  addLink,
  removeLink,
  updateLink,
}: ProfileFormProps) {
  return (
    <>
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-semibold text-[#0F172A]">한 줄 자기소개</p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-2">추천 카드에 표시되는 짧은 소개 (30자 이내 권장)</p>
        <input
          type="text"
          value={form.one_liner}
          onChange={(e) => set('one_liner', e.target.value)}
          maxLength={50}
          placeholder={oneLinerPlaceholder}
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      <div className="mb-6 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-4">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-3">이 프로젝트에서 원하는 것</p>
        <ChipGroup
          label="참여 목표"
          options={options.goals}
          selected={toArray(form.goal)}
          onChange={(v) => set('goal', toSingle(v))}
          multi={false}
        />
        <ChipGroup
          label="협업 방식"
          options={options.collaborations}
          selected={toArray(form.collaboration)}
          onChange={(v) => set('collaboration', toSingle(v))}
          multi={false}
        />
      </div>

      <BioAccordionField form={form} set={set} bioQuestions={bioQuestions} bioOpen={bioOpen} setBioOpen={setBioOpen} />

      <ChipGroup label="기술 스택" options={skillOptions} selected={form.skills} onChange={(v) => set('skills', v)} />

      <ChipGroup
        label="활동 가능 시간"
        options={options.available_times}
        selected={toArray(form.available_time)}
        onChange={(v) => set('available_time', toSingle(v))}
        multi={false}
      />
      <ChipGroup label="선호 지역" options={options.regions} selected={form.regions} onChange={(v) => set('regions', v)} />

      <div className="mb-6 bg-[#F0F9FF] rounded-2xl border border-[#BAE6FD] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[13px] font-semibold text-[#0F172A]">소통 방식</p>
          <span className="text-[11px] font-semibold text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
            AI 체크포인트 반영
          </span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-3">
          이 항목은 AI 추천 카드의 '체크 포인트' 근거로 사용돼요. 팀원 간 소통 스타일 불일치를 미리 알려드려요.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.communications.map((opt) => (
            <button
              key={opt}
              onClick={() => set('communication', opt)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                form.communication === opt
                  ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                  : 'bg-white text-[#64748B] border-[#E2EAF4] hover:border-[#0EA5E9]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <ChipGroup label="관심 분야" options={options.interests} selected={form.interests} onChange={(v) => set('interests', v)} />

      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">포트폴리오 링크</p>
        <p className="text-[12px] text-[#64748B] mb-3">Notion 기획서, 블로그 등 링크를 등록할 수 있어요. (선택)</p>
        <PortfolioLinksField links={form.links} addLink={addLink} removeLink={removeLink} updateLink={updateLink} />
      </div>
    </>
  )
}
```

- [ ] **4단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **5단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 새 파일 3개만 확인. 커밋하지 않는다.

---

### 태스크 5: `ProfileSetupScreen.tsx`를 디스패처로 재구성

**파일:**
- 수정: `frontend/src/screens/ProfileSetupScreen.tsx` (전체 교체)

**인터페이스:**
- 소비: 태스크 2의 `useProfileCategory`, 태스크 4의 `DevProfileForm`/`DesignProfileForm`/`PlanningProfileForm`

- [ ] **1단계: 파일 전체 교체**

`frontend/src/screens/ProfileSetupScreen.tsx`를 아래 내용으로 완전히 교체한다:

```tsx
import { useEffect, useState } from 'react'
import { profileApi, recommendationApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { ChipGroup, InlineError, PrimaryButton, Toggle } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useMutation } from '@/hooks/useMutation'
import { useProfileCategory } from '@/hooks/useProfileCategory'
import { useQuery } from '@/hooks/useQuery'
import { routes, useNavigate } from '@/lib/router'
import { DesignProfileForm } from './profile/DesignProfileForm'
import { DevProfileForm } from './profile/DevProfileForm'
import { PlanningProfileForm } from './profile/PlanningProfileForm'
import type { PortfolioLink, ProfileInput } from '@/types'

const EMPTY_PROFILE: ProfileInput = {
  roles: [],
  skills: [],
  available_time: '',
  regions: [],
  goal: '',
  collaboration: '',
  communication: '',
  interests: [],
  one_liner: '',
  bio_style: '',
  bio_strength: '',
  bio_experience: '',
  bio_goal: '',
  bio_contribution: '',
  links: [],
  open_chat: '',
  phone: '',
  is_private: false,
}

/**
 * 개인 프로필 & 희망 조건 작성.
 *
 * `hackathonId`가 있으면 저장 후 해당 해커톤의 추천 생성을 트리거하고 결과 화면으로,
 * 없으면(마이페이지에서 진입) 저장만 하고 마이페이지로 돌아간다.
 *
 * 대표 역할 선택과 저장 버튼 등 공통 UI만 여기서 그리고, 역할 카테고리에 따라
 * 달라지는 나머지 입력 영역은 DevProfileForm/DesignProfileForm/PlanningProfileForm에
 * 위임한다 (profile/ 디렉토리 참고).
 */
export function ProfileSetupScreen({ hackathonId }: { hackathonId: number | null }) {
  const navigate = useNavigate()
  const { options } = useMetaOptions()

  const { data, loading, error, refetch } = useQuery('me:profile', () => profileApi.mine())
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE)
  const [bioOpen, setBioOpen] = useState(true)

  const { primaryCategory, skillOptions, bioQuestions, oneLinerPlaceholder } = useProfileCategory(
    form.roles,
    options,
    form.skills,
  )

  // 서버에서 받은 기존 프로필로 폼을 초기화한다
  useEffect(() => {
    if (data) setForm({ ...EMPTY_PROFILE, ...data })
  }, [data])

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const addLink = () => set('links', [...form.links, { type: 'GitHub', url: '' }])
  const removeLink = (index: number) =>
    set('links', form.links.filter((_, i) => i !== index))
  const updateLink = (index: number, patch: Partial<PortfolioLink>) =>
    set('links', form.links.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const save = useMutation(
    async (input: ProfileInput) => {
      await profileApi.save(input)
      // 프로필이 바뀌었으니 추천을 다시 계산하도록 요청한다.
      // 추천 생성이 실패해도 프로필 저장 자체는 성공이므로 여기서 막지 않는다.
      if (hackathonId) {
        try {
          await recommendationApi.generate(hackathonId)
        } catch {
          /* 추천 결과 화면에서 재시도할 수 있다 */
        }
      }
    },
    {
      onSuccess: () => {
        navigate(hackathonId ? routes.recommendations(hackathonId) : routes.mypage)
      },
    },
  )

  // 상세 자기소개 5개 항목은 전부 채워야 한다 — AI 매칭 근거로 쓰이는 핵심 정보라 필수로 바뀌었다
  const bioComplete = bioQuestions.every((q) => form[q.key].trim().length > 0)
  // AI 카드가 없는 추천(5위 밖, AI 호출 실패)은 이 문구로 사람을 소개하므로 비워둘 수 없다
  const oneLinerComplete = form.one_liner.trim().length > 0
  // 최소 조건: 역할 하나는 골라야 매칭이 의미가 있다
  const canSubmit = form.roles.length > 0 && oneLinerComplete && bioComplete && !save.loading

  if (loading) {
    return (
      <Page>
        <LoadingState label="프로필을 불러오는 중이에요…" />
      </Page>
    )
  }

  // 404(아직 프로필 없음)는 에러가 아니라 신규 작성 케이스로 취급한다
  if (error && error.status !== 404) {
    return (
      <Page>
        <ErrorState error={error} onRetry={refetch} />
      </Page>
    )
  }

  const formProps = {
    form,
    set,
    options,
    skillOptions,
    bioQuestions,
    oneLinerPlaceholder,
    bioOpen,
    setBioOpen,
    addLink,
    removeLink,
    updateLink,
  }

  return (
    <Page>
      <h1 className="text-[20px] font-bold text-gray-800">개인 프로필 &amp; 희망 조건</h1>
      <p className="text-[13px] text-[#8FA3BF] mt-1 mb-8">AI 추천을 위해 정보를 입력해주세요</p>

      <ChipGroup label="대표 역할" options={options.roles} selected={form.roles} onChange={(v) => set('roles', v)} />

      {primaryCategory === 'design' ? (
        <DesignProfileForm {...formProps} />
      ) : primaryCategory === 'planning' ? (
        <PlanningProfileForm {...formProps} />
      ) : (
        <DevProfileForm {...formProps} />
      )}

      {/* 오픈채팅 링크 */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">오픈채팅/연락처 링크</p>
        <p className="text-[12px] text-[#64748B] mb-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round">
            <rect x="3" y="5" width="6" height="5" rx="1" />
            <path d="M4.5 5V3.5a1.5 1.5 0 0 1 3 0V5" />
          </svg>
          커피챗 수락 후 상대방에게만 공개됩니다
        </p>
        <input
          type="url"
          value={form.open_chat}
          onChange={(e) => set('open_chat', e.target.value)}
          placeholder="https://open.kakao.com/o/..."
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      {/* 전화번호 — 팀장이 "수동으로 참가자 추가"할 때 회원 조회 키로 쓰인다 */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">전화번호</p>
        <p className="text-[12px] text-[#64748B] mb-2">
          팀장이 참가자를 수동으로 추가할 때 회원 확인용으로 쓰여요. (선택)
        </p>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="010-1234-5678"
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      <div className="flex items-center justify-between bg-[#F0F5FC] rounded-xl border border-[#E2EAF4] px-4 py-3.5 mb-8">
        <div>
          <p className="text-[13px] font-semibold text-gray-700">추천 대상에서 비공개</p>
          <p className="text-[12px] text-[#8FA3BF] mt-0.5">켜면 다른 사람의 추천 리스트에 노출되지 않아요</p>
        </div>
        <Toggle value={form.is_private} onChange={(v) => set('is_private', v)} />
      </div>

      <InlineError message={save.error?.message} />
      {!canSubmit && form.roles.length === 0 && (
        <p className="text-[12px] text-[#94A3B8] mb-2">대표 역할을 최소 1개 선택해주세요.</p>
      )}
      {!canSubmit && form.roles.length > 0 && !oneLinerComplete && (
        <p className="text-[12px] text-[#94A3B8] mb-2">한 줄 자기소개를 작성해주세요.</p>
      )}
      {!canSubmit && form.roles.length > 0 && oneLinerComplete && !bioComplete && (
        <p className="text-[12px] text-[#94A3B8] mb-2">상세 자기소개 5개 항목을 모두 작성해주세요.</p>
      )}

      <PrimaryButton onClick={() => save.mutate(form)} loading={save.loading} disabled={!canSubmit} className="w-full">
        {hackathonId ? '저장하고 추천받기' : '프로필 저장'}
      </PrimaryButton>
    </Page>
  )
}
```

- [ ] **2단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **3단계: 수동 확인 (프론트엔드 자동 테스트 없음)**

1. `docker compose up -d` 후 `frontend/`에서 `pnpm dev`.
2. `docker compose exec backend uv run python manage.py issue_token <이메일>`로 토큰 발급 후 로그인, 또는 카카오 로그인.
3. `#/profile` 진입 → 대표 역할을 "디자인"으로 바꿔보고 포트폴리오 링크가 상단에 강조되어 보이는지, "기획"으로 바꿔보고 "이 프로젝트에서 원하는 것" 박스가 상단에 보이는지, "백엔드"로 바꿔보고 기존과 동일한 배치인지 확인.
4. 각 경우 저장이 정상적으로 되는지 (`PUT /me/profile/` 그대로이므로 페이로드 형태는 변경 없음) 확인.

- [ ] **4단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 확인. 커밋하지 않는다.

---

### 태스크 6: 공개 화면 공용 필드 컴포넌트 생성

**파일:**
- 신규: `frontend/src/screens/profile/BioItemsView.tsx`
- 신규: `frontend/src/screens/profile/LinksView.tsx`

**인터페이스:**
- 소비: 태스크 1의 `BioQuestion` 타입
- 산출물: `BioItemsView`, `LinksView` — 태스크 7에서 소비

- [ ] **1단계: 자기소개 읽기 전용 컴포넌트**

`frontend/src/screens/profile/BioItemsView.tsx` (기존 `MemberProfileScreen.tsx`의 `bioItems` 계산 + 렌더링을 컴포넌트화, 라벨을 `bioQuestions`에서 가져오도록 변경):

```tsx
import type { BioQuestion } from '@/lib/profileCategoryContent'
import type { MemberProfile } from '@/types'

/** 자기소개 5문항 읽기 전용 표시. 문항 라벨(bioQuestions)만 카테고리별로 다르다. */
export function BioItemsView({ data, bioQuestions }: { data: MemberProfile; bioQuestions: BioQuestion[] }) {
  const bioItems = bioQuestions
    .map((q) => ({ label: q.label, value: data[q.key] }))
    .filter((item) => item.value)

  return (
    <div className="mb-6">
      <p className="text-[13px] font-semibold text-[#0F172A] mb-3">자기소개</p>
      <div className="bg-white rounded-2xl border border-[#E2EAF4] overflow-hidden">
        {bioItems.length > 0 ? (
          bioItems.map((q, idx) => (
            <div
              key={q.label}
              className={`px-5 py-4 ${idx < bioItems.length - 1 ? 'border-b border-[#F8FAFC]' : ''}`}
            >
              <p className="text-[11px] font-semibold text-[#0EA5E9] mb-1 uppercase tracking-wide">
                {q.label}
              </p>
              <p className="text-[14px] text-[#0F172A] leading-relaxed">{q.value}</p>
            </div>
          ))
        ) : (
          <div className="px-5 py-4">
            <p className="text-[14px] text-[#94A3B8] leading-relaxed">
              아직 작성된 자기소개가 없어요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **2단계: 포트폴리오 링크 읽기 전용 컴포넌트**

`frontend/src/screens/profile/LinksView.tsx` (기존 링크 렌더링에서 제목/래퍼를 뺀 것 — 태스크 3의 `PortfolioLinksField`와 대칭):

```tsx
import { LINK_META } from '@/lib/constants'
import type { LinkType, PortfolioLink } from '@/types'

/** 포트폴리오 링크 읽기 전용 표시. */
export function LinksView({ links }: { links: PortfolioLink[] }) {
  if (links.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link, i) => {
        const meta = LINK_META[link.type as LinkType] ?? LINK_META['기타']
        return (
          <a
            key={`${link.type}-${i}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 border rounded-full px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-75 ${meta.color} ${meta.bg} ${meta.border}`}
          >
            <span className="text-[14px]">{meta.icon}</span>
            {link.type}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-50">
              <path d="M2 8L8 2M4 2h4v4" />
            </svg>
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **3단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **4단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 새 파일 2개만 확인. 커밋하지 않는다.

---

### 태스크 7: 직군별 공개 화면(View) 3종 생성

**파일:**
- 신규: `frontend/src/screens/profile/DevProfileView.tsx`
- 신규: `frontend/src/screens/profile/DesignProfileView.tsx`
- 신규: `frontend/src/screens/profile/PlanningProfileView.tsx`

**인터페이스:**
- 소비: 태스크 3의 `ProfileViewProps`, 태스크 6의 `BioItemsView`/`LinksView`
- 산출물: `DevProfileView`/`DesignProfileView`/`PlanningProfileView` — 태스크 8에서 소비

세 파일 모두 같은 모양이라 한 태스크로 묶는다.

- [ ] **1단계: 개발자 공개 화면**

`frontend/src/screens/profile/DevProfileView.tsx`:

```tsx
import { BioItemsView } from './BioItemsView'
import { LinksView } from './LinksView'
import type { ProfileViewProps } from './types'

/** 개발자 공개 프로필: 기술 스택 + 포트폴리오 링크를 상단에 강조한다. */
export function DevProfileView({ data, bioQuestions }: ProfileViewProps) {
  return (
    <>
      {data.one_liner && (
        <p className="text-[14px] text-[#64748B] mb-5 leading-relaxed">{data.one_liner}</p>
      )}

      {data.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {data.skills.map((s) => (
            <span key={s} className="bg-white border border-[#E2EAF4] text-gray-600 text-[13px] px-3 py-1 rounded-lg">
              {s}
            </span>
          ))}
        </div>
      )}

      {data.links.length > 0 && (
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-[#0F172A] mb-2.5">포트폴리오</p>
          <LinksView links={data.links} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(
          [
            ['활동 가능 시간', data.available_time],
            ['참여 목표', data.goal],
            ['협업 방식', data.collaboration],
            ['소통 방식', data.communication],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2EAF4] p-4">
            <p className="text-[11px] text-[#8FA3BF] mb-1">{label}</p>
            <p className="text-[14px] font-semibold text-gray-800">{value || '—'}</p>
          </div>
        ))}
      </div>

      {data.interests.length > 0 && (
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-gray-700 mb-2">관심 분야</p>
          <div className="flex gap-2 flex-wrap">
            {data.interests.map((i) => (
              <span key={i} className="bg-blue-100 text-[#4EAAF5] text-[12px] font-semibold px-3 py-1 rounded-full">
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      <BioItemsView data={data} bioQuestions={bioQuestions} />
    </>
  )
}
```

- [ ] **2단계: 디자이너 공개 화면**

`frontend/src/screens/profile/DesignProfileView.tsx`:

```tsx
import { BioItemsView } from './BioItemsView'
import { LinksView } from './LinksView'
import type { ProfileViewProps } from './types'

/** 디자이너 공개 프로필: 포트폴리오 링크를 최상단에 강조한다. */
export function DesignProfileView({ data, bioQuestions }: ProfileViewProps) {
  return (
    <>
      {data.links.length > 0 && (
        <div className="mb-5 bg-[#FDF2F8] rounded-2xl border border-[#FBCFE8] p-4">
          <p className="text-[13px] font-semibold text-[#0F172A] mb-2.5">포트폴리오</p>
          <LinksView links={data.links} />
        </div>
      )}

      {data.one_liner && (
        <p className="text-[14px] text-[#64748B] mb-5 leading-relaxed">{data.one_liner}</p>
      )}

      {data.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {data.skills.map((s) => (
            <span key={s} className="bg-white border border-[#E2EAF4] text-gray-600 text-[13px] px-3 py-1 rounded-lg">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(
          [
            ['활동 가능 시간', data.available_time],
            ['참여 목표', data.goal],
            ['협업 방식', data.collaboration],
            ['소통 방식', data.communication],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2EAF4] p-4">
            <p className="text-[11px] text-[#8FA3BF] mb-1">{label}</p>
            <p className="text-[14px] font-semibold text-gray-800">{value || '—'}</p>
          </div>
        ))}
      </div>

      {data.interests.length > 0 && (
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-gray-700 mb-2">관심 분야</p>
          <div className="flex gap-2 flex-wrap">
            {data.interests.map((i) => (
              <span key={i} className="bg-blue-100 text-[#4EAAF5] text-[12px] font-semibold px-3 py-1 rounded-full">
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      <BioItemsView data={data} bioQuestions={bioQuestions} />
    </>
  )
}
```

- [ ] **3단계: 기획자 공개 화면**

`frontend/src/screens/profile/PlanningProfileView.tsx`:

```tsx
import { BioItemsView } from './BioItemsView'
import { LinksView } from './LinksView'
import type { ProfileViewProps } from './types'

/** 기획자 공개 프로필: 참여 목표·협업 방식과 자기소개를 상단에 강조하고, 기술 스택은 아래로 내린다. */
export function PlanningProfileView({ data, bioQuestions }: ProfileViewProps) {
  return (
    <>
      {data.one_liner && (
        <p className="text-[14px] text-[#64748B] mb-5 leading-relaxed">{data.one_liner}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(
          [
            ['참여 목표', data.goal],
            ['협업 방식', data.collaboration],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-[#FFFBEB] rounded-xl border border-[#FDE68A] p-4">
            <p className="text-[11px] text-[#92400E] mb-1">{label}</p>
            <p className="text-[14px] font-semibold text-gray-800">{value || '—'}</p>
          </div>
        ))}
      </div>

      <BioItemsView data={data} bioQuestions={bioQuestions} />

      {data.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {data.skills.map((s) => (
            <span key={s} className="bg-white border border-[#E2EAF4] text-gray-600 text-[13px] px-3 py-1 rounded-lg">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(
          [
            ['활동 가능 시간', data.available_time],
            ['소통 방식', data.communication],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2EAF4] p-4">
            <p className="text-[11px] text-[#8FA3BF] mb-1">{label}</p>
            <p className="text-[14px] font-semibold text-gray-800">{value || '—'}</p>
          </div>
        ))}
      </div>

      {data.interests.length > 0 && (
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-gray-700 mb-2">관심 분야</p>
          <div className="flex gap-2 flex-wrap">
            {data.interests.map((i) => (
              <span key={i} className="bg-blue-100 text-[#4EAAF5] text-[12px] font-semibold px-3 py-1 rounded-full">
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.links.length > 0 && (
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-[#0F172A] mb-2.5">포트폴리오</p>
          <LinksView links={data.links} />
        </div>
      )}
    </>
  )
}
```

- [ ] **4단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **5단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 새 파일 3개만 확인. 커밋하지 않는다.

---

### 태스크 8: `MemberProfileScreen.tsx`를 디스패처로 재구성

**파일:**
- 수정: `frontend/src/screens/MemberProfileScreen.tsx` (전체 교체)

**인터페이스:**
- 소비: 태스크 2의 `useProfileCategory`, 태스크 7의 `DevProfileView`/`DesignProfileView`/`PlanningProfileView`

- [ ] **1단계: 파일 전체 교체**

`frontend/src/screens/MemberProfileScreen.tsx`를 아래 내용으로 완전히 교체한다:

```tsx
import { useState } from 'react'
import { profileApi } from '@/api'
import { CoffeeChatModal } from '@/components/CoffeeChatModal'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { Avatar, BackButton, StatusBadge, useToast } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useProfileCategory } from '@/hooks/useProfileCategory'
import { initialOf } from '@/lib/format'
import { lastHackathonId } from '@/lib/prefs'
import { useQuery } from '@/hooks/useQuery'
import { useLocation } from '@/lib/router'
import { DesignProfileView } from './profile/DesignProfileView'
import { DevProfileView } from './profile/DevProfileView'
import { PlanningProfileView } from './profile/PlanningProfileView'

export function MemberProfileScreen({ userId }: { userId: number }) {
  const { query } = useLocation()
  const { toast, show } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const { options } = useMetaOptions()

  // 커피챗은 해커톤 단위라 컨텍스트가 필요하다.
  // 링크에 hackathon 파라미터가 있으면 그걸, 없으면 마지막으로 본 해커톤을 쓴다.
  const hackathonId = Number(query.get('hackathon')) || lastHackathonId()

  const { data, loading, error, refetch, setData } = useQuery(`profile:${userId}`, () =>
    profileApi.member(userId),
  )

  const { primaryCategory, bioQuestions } = useProfileCategory(data?.roles ?? [], options)

  return (
    <Page>
      {toast}
      <BackButton label="뒤로" onClick={() => window.history.back()} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Avatar initial={data.initial || initialOf(data.name)} size={64} className="bg-[#4EAAF5]" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-bold text-gray-800">{data.name}</h1>
                {data.review_summary.count > 0 && (
                  <span className="text-[13px] font-semibold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-full">
                    ⭐ {data.review_summary.average} ({data.review_summary.count})
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {data.roles.map((r) => (
                  <span key={r} className="bg-blue-100 text-[#4EAAF5] text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {primaryCategory === 'design' ? (
            <DesignProfileView data={data} bioQuestions={bioQuestions} />
          ) : primaryCategory === 'planning' ? (
            <PlanningProfileView data={data} bioQuestions={bioQuestions} />
          ) : (
            <DevProfileView data={data} bioQuestions={bioQuestions} />
          )}

          {data.reviews.length > 0 && (
            <div className="mb-6">
              <p className="text-[13px] font-semibold text-[#0F172A] mb-3">받은 리뷰</p>
              <div className="flex flex-col gap-2">
                {data.reviews.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl border border-[#E2EAF4] p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[12px] font-semibold text-[#0F172A]">
                        {r.reviewer_name}
                        <span className="text-[#94A3B8] font-normal ml-1.5">· {r.hackathon.title}</span>
                      </p>
                      <span className="text-[12px] font-bold text-[#F59E0B] flex-shrink-0">
                        {'⭐'.repeat(r.rating)}
                      </span>
                    </div>
                    {r.content && <p className="text-[13px] text-[#64748B] leading-relaxed">{r.content}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 연락처 — 서버가 커피챗 수락 전에는 null로 내려준다 */}
          <div className="rounded-xl border px-5 py-3.5 mb-4 flex items-center gap-3 bg-white border-[#E2EAF4]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke={data.open_chat ? '#22C55E' : '#94A3B8'}
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            {data.open_chat ? (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#22C55E]">오픈채팅/연락처</p>
                <a href={data.open_chat} target="_blank" rel="noreferrer" className="text-[13px] text-[#0EA5E9] underline break-all">
                  {data.open_chat}
                </a>
              </div>
            ) : (
              <div>
                <p className="text-[12px] font-semibold text-[#94A3B8]">오픈채팅/연락처</p>
                <p className="text-[12px] text-[#94A3B8]">커피챗 수락 후 공개</p>
              </div>
            )}
          </div>

          {data.coffeechat_sent ? (
            <div className="w-full bg-[#F1F5F9] border border-[#E2EAF4] rounded-xl py-3.5 flex items-center justify-center gap-2">
              <span className="text-[14px] font-semibold text-[#94A3B8]">커피챗 신청함</span>
              {data.coffeechat_status && <StatusBadge status={data.coffeechat_status} />}
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              disabled={!hackathonId}
              title={hackathonId ? undefined : '해커톤을 먼저 선택해주세요'}
              className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[15px] rounded-xl py-3.5 transition-colors shadow-sm disabled:bg-[#BAE6FD] disabled:cursor-not-allowed"
            >
              커피챗 신청하기
            </button>
          )}

          {modalOpen && hackathonId && (
            <CoffeeChatModal
              target={{
                userId: data.id,
                name: data.name,
                initial: data.initial || initialOf(data.name),
                role: data.roles[0] ?? '팀원',
              }}
              hackathonId={hackathonId}
              onClose={() => setModalOpen(false)}
              onSent={() => {
                setData((prev) => (prev ? { ...prev, coffeechat_sent: true, coffeechat_status: 'pending' } : prev))
                setModalOpen(false)
                show('커피챗 신청을 보냈어요')
              }}
            />
          )}
        </>
      )}
    </Page>
  )
}
```

- [ ] **2단계: 타입체크**

실행: `cd frontend && pnpm typecheck`
예상: 통과

- [ ] **3단계: 수동 확인 (프론트엔드 자동 테스트 없음)**

1. 백엔드/프론트 개발 서버가 떠 있는 상태에서, 서로 다른 대표 역할을 가진 계정 3개(개발/디자인/기획 각각 1개)를 준비한다(`manage.py shell`로 `Profile.roles`를 설정하거나 기존 화면에서 저장).
2. `#/users/<id>`로 각 계정의 공개 프로필을 열어 직군별로 다른 배치(디자인은 포트폴리오 링크 상단, 기획은 목표/협업 상단, 개발은 스킬+링크 상단)가 보이는지 확인.
3. 커피챗 신청 버튼, 연락처 잠금, 리뷰 섹션 등 공통 영역이 3개 계정 모두에서 그대로 동작하는지 확인 (직군과 무관하게 동일해야 함).

- [ ] **4단계: 변경 파일 확인 (커밋은 하지 않음)**

`git status --short`로 확인. 커밋하지 않는다.

---

## 셀프 리뷰 노트

- **스펙 커버리지:** 스펙의 "작성 화면도 직군별로 구조 재구성" → 태스크 4~5. "공개 화면" → 태스크 6~8. "기존 필드만 재배치" → 새 Profile 필드/마이그레이션 없음(태스크 전체에서 확인). "김준석 계정은 개발자 페이지" → 별도 데이터 작업 불필요(이미 `백엔드` 역할이 `dev` 카테고리로 매핑됨, 스펙 문서의 오픈 퀘스천 1번 참고).
- **플레이스홀더 스캔:** 없음 — 모든 코드 블록이 그대로 작성할 실제 내용.
- **타입 일관성:** `ProfileFormProps`/`ProfileViewProps`(태스크 3)가 각 Form/View 컴포넌트(태스크 4, 7)의 props와 정확히 일치, `useProfileCategory`(태스크 2)의 반환 타입이 두 디스패처(태스크 5, 8)에서 구조분해하는 필드명과 일치함을 확인.
- **커밋 정책 반영:** 전역 제약사항에 "커밋 금지"를 명시했고, 모든 태스크의 마지막 단계를 "변경 파일 확인(커밋 없음)"으로 통일함.

## 실행 방식 선택

계획 작성 완료, `docs/superpowers/plans/2026-09-15-job-category-profile-pages.md`에 저장했습니다 (커밋은 하지 않았습니다 — 검토 후 직접 커밋해주세요). 실행 방식을 선택해주세요:

1. **서브에이전트 기반(권장)** — 태스크마다 새 서브에이전트를 투입하고 중간중간 검토
2. **인라인 실행** — 이 세션에서 배치 단위로 실행하고 체크포인트마다 검토

단, 이번에는 구현자 에이전트가 각 태스크 끝에 커밋을 하지 않도록(위 전역 제약사항대로) 지시를 조정해서 진행하겠습니다.
