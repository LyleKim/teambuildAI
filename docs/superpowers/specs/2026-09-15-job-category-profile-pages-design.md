# Job-Category Portfolio Profile Pages — Design

**Status:** Draft — awaiting user review before implementation planning.

## Problem

The profile setup screen (`ProfileSetupScreen`) and the public profile view (`MemberProfileScreen`) currently render one fixed layout for every user regardless of job function. An earlier change (merged 2026-09-14) made the skill-chip options and the 5 self-intro question placeholders react to the user's role category (개발/디자인/기획), but the page *structure* — section order, what's emphasized, what looks like a portfolio — is still identical for everyone.

The user wants each job category to get a genuinely different-feeling profile: a developer's profile should read like a dev portfolio (tech stack + code links up front), a designer's like a design portfolio (visual links up front), a planner's like a case-study narrative (goals/collaboration story up front) — both when *writing* the profile and when *viewing* someone else's.

## Scope

- **In scope:** restructuring `ProfileSetupScreen` (write) and `MemberProfileScreen` (view) into category-specific layouts, using only data already on the `Profile` model.
- **Out of scope (explicitly deferred by the user):** any new `Profile` fields or migrations for richer portfolio content (project/case-study entries, image uploads) — this iteration only rearranges existing fields (`roles`, `skills`, `one_liner`, the 5 `bio_*` fields, `links`, `available_time`, `goal`, `collaboration`, `communication`, `interests`, contact fields). A future iteration can revisit richer per-category content once this structural split exists.
- **Out of scope (separate spec):** the new email/password + session-cookie login feature the user also requested — decomposed into its own spec/plan, to follow this one.
- Categories: the 3 already established by the merged role-branching work — `dev` (백엔드/프론트엔드/AI-ML), `design` (디자인), `planning` (기획). No 4th "PM" category.

## Architecture

`ProfileSetupScreen` and `MemberProfileScreen` become thin dispatchers. Each keeps the chrome that's the same for everyone (avatar/name header, save button / loading / error states, coffeechat CTA + contact reveal) and delegates the category-varying "body" to one of six new leaf components under a new `frontend/src/screens/profile/` directory:

- Write side: `DevProfileForm.tsx`, `DesignProfileForm.tsx`, `PlanningProfileForm.tsx`
- View side: `DevProfileView.tsx`, `DesignProfileView.tsx`, `PlanningProfileView.tsx`

A new shared hook, `frontend/src/hooks/useProfileCategory.ts`, replaces the `activeCategories`/`primaryCategory`/`skillOptions`/`bioQuestions` logic currently inlined in `ProfileSetupScreen.tsx` (from the 2026-09-14 merge). Its signature:

```ts
function useProfileCategory(
  roles: string[],
  options: MetaOptions,
): {
  primaryCategory: RoleCategory
  skillOptions: string[]
  bioQuestions: BioQuestion[]
  oneLinerPlaceholder: string
}
```

Both parent screens call this hook once (in `ProfileSetupScreen`, with the in-progress `form.roles`; in `MemberProfileScreen`, with the fetched `data.roles`) and pass the results down as props to whichever leaf component matches `primaryCategory`. Leaf components never recompute category logic themselves — they only render, and (on the form side) call the `set()` callback they're given.

The existing `BIO_QUESTIONS_BY_CATEGORY` / `ONE_LINER_PLACEHOLDER_BY_CATEGORY` constants move out of `ProfileSetupScreen.tsx` into `frontend/src/lib/profileCategoryContent.ts`, since both the hook and (indirectly, via the hook) both screens need them — `MemberProfileScreen` currently hardcodes generic bio labels; after this change its labels come from the same per-category source as the form, so a designer's public profile shows the same section labels a designer saw while writing it.

## Per-category layout direction

Same underlying fields everywhere (nothing new to fetch/save) — only order and emphasis differ:

- **Dev:** skills (tech stack) chips and portfolio links (GitHub etc.) surfaced near the top, right under the one-liner. Bio section keeps its current order (style → strength → experience → goal → contribution).
- **Design:** portfolio links surfaced first, laid out as a prominent link/icon row (closest to a visual gallery this data model supports without new fields), then skills, then bio.
- **Planning:** `goal`(참여 목표) and `collaboration`(협업 방식) surfaced early alongside the one-liner as the "pitch," bio section re-ordered to foreground goal/contribution over style/strength, skills chips shown last (least visually load-bearing for this role).

Exact pixel-level layout is left to implementation (existing Tailwind utility patterns from the current screens carry over) — this spec fixes section presence, order, and emphasis per category, not visual polish.

## Data flow

1. `ProfileSetupScreen` fetches `me:profile` (unchanged) and `useMetaOptions()` (unchanged).
2. Calls `useProfileCategory(form.roles, options)`.
3. Renders the shared header/role-chip-picker (unchanged — role selection stays common to all categories, since it's what *drives* which category renders) then switches on `primaryCategory` to render one of the three `*ProfileForm` components, passing `{ form, set, skillOptions, bioQuestions, oneLinerPlaceholder, links helpers (addLink/removeLink/updateLink) }`.
4. Save/validation logic (`bioComplete`, `canSubmit`, the mutation) stays in the parent — it already only depends on `bioQuestions` and `form`, both available there.
5. `MemberProfileScreen` fetches `profile:{userId}` (unchanged), calls `useProfileCategory(data.roles, options)` (needs `useMetaOptions()` added — it doesn't currently call it), switches on `primaryCategory` to render one of the three `*ProfileView` components with `{ data, bioQuestions }`; the coffeechat modal/contact/reviews sections stay in the parent since they don't vary by category.

## Error handling

No new failure modes. Same fallback the merged code already has: empty or unrecognized roles fall back to `primaryCategory = 'dev'` (via `useProfileCategory`'s internal reuse of the existing `activeCategories` derivation), so a profile with no role picked yet still renders (as the dev layout) instead of crashing. Loading/error states for both screens are unchanged — they still belong to the parent dispatcher, rendered before the category switch.

## Testing

This repo has no frontend automated test runner (established convention from the prior plan) — verification is:
- `pnpm typecheck` clean across all 8 new/changed files.
- Manual check in the browser for all 3 categories, both screens: switch a test profile's role between 백엔드/디자인/기획 and confirm each combination of (write screen × category) and (view screen × category) renders the right section order with no console errors, and that saving still round-trips correctly through the unchanged `PUT /me/profile/` contract.

No backend changes, so no backend test impact.

## File structure

- Create: `frontend/src/hooks/useProfileCategory.ts`
- Create: `frontend/src/lib/profileCategoryContent.ts` (moves `BIO_QUESTIONS_BY_CATEGORY`, `ONE_LINER_PLACEHOLDER_BY_CATEGORY`, `RoleCategory` type, `DEFAULT_CATEGORY` out of `ProfileSetupScreen.tsx`)
- Create: `frontend/src/screens/profile/DevProfileForm.tsx`
- Create: `frontend/src/screens/profile/DesignProfileForm.tsx`
- Create: `frontend/src/screens/profile/PlanningProfileForm.tsx`
- Create: `frontend/src/screens/profile/DevProfileView.tsx`
- Create: `frontend/src/screens/profile/DesignProfileView.tsx`
- Create: `frontend/src/screens/profile/PlanningProfileView.tsx`
- Modify: `frontend/src/screens/ProfileSetupScreen.tsx` (becomes the dispatcher + shared chrome + save logic only)
- Modify: `frontend/src/screens/MemberProfileScreen.tsx` (becomes the dispatcher + shared chrome only; gains a `useMetaOptions()` call it doesn't currently have)

No backend files change for this spec.

## Open questions for the user (please confirm or correct)

1. The 김준석 Kakao account should already have `roles` set such that it maps to `dev` (it already has `백엔드` from earlier testing during the prior plan's work, per the session's QA) — confirm this is the account you mean, or should its `roles` be set explicitly as part of this work?
2. Section-order details above (e.g., "skills last" for planning) are a starting proposal, not a strict requirement — fine to leave exact ordering to be eyeballed during implementation rather than nailed down further here?
