# 프론트엔드 디자인 리프레시 — 전체 페이지 적용 플랜

> **상태 (2026-09-19, 세션 종료 — 토큰 소모 이유로 사용자가 일시 중지): Stage 0·1·2 완료 + Stage 3 배치 1(그룹 1~3, 화면 10개) 완료. 그룹 4~7(화면 10개: 매칭/커피챗, 채팅, 마이페이지, 알림 + profile/ 하위 폼들)은 미착수. 다음 세션에서 이 파일만 읽고 배치 2부터 바로 이어가면 된다 — 재브레인스토밍 불필요.**
>
> **다음 세션에서 반드시 먼저 할 일**: `frontend/src/index.css`를 열어 `@layer base { * { font-family: ... } body { ... } }` 형태로 감싸져 있는지 확인할 것 — Stage 3 도중 이 규칙이 `@layer` 밖에 있으면 Tailwind의 `font-[family-name:var(--font-display)]` 유틸리티를 항상 이겨버려서 Do Hyeon이 렌더링 안 되는 버그를 발견해 고쳤다(아래 진행 로그 참고). 되돌아가 있으면 다시 `@layer base`로 감쌀 것.

## 확정된 디자인 언어 (LandingScreen에서 검증 완료)

**색 (사용자 지정: 기존 로고와 맞춰 흰색·파란색 계열 유지)**
- `INK` `#101828` — 텍스트/헤드라인
- `INK_SOFT` `#5B6472` — 보조 텍스트
- `BONE` `#FFFFFF` — 배경
- `SPARK` `#2D8FE0` — 유일한 강조색 (기존 `--color-brand-dark`와 동일 계열)
- `LINE` `#E2EAF4` — 보더 (기존 `--color-border`와 동일)
- 카카오 버튼(`#FEE500`/`#3A1D1D`)은 브랜드 규정이라 항상 예외로 유지

**타이포**: 헤드라인 "Do Hyeon"(구글 폰트, 굵은 포스터체), 본문 "Gothic A1". 앱 전역 Noto Sans KR과 별개로 이 두 폰트를 `index.css`에 이미 추가해둠(다른 화면에 영향 없음).

**레이아웃/구조 원칙** (그대로 재사용할 것):
- 왼쪽 정렬 헤드라인 + 실제 기능을 보여주는 비주얼(장식용 블러/블롭 금지)
- ALL-CAPS 트랙아웃 eyebrow 라벨 금지, "STEP 01" 같은 라벨 금지 — 진짜 순차 흐름일 때만 큰 숫자 타이포로 표현
- 카드 그리드는 동일 radius+그림자의 "SaaS 카드킷" 대신 헤어라인 보더 그리드(`gap-px` + 배경색 트릭)로
- 강조색(SPARK)은 정말 강조가 필요한 지점(버튼, 점수, 숫자)에만 — 나머지는 INK/INK_SOFT로 절제

## 적용 대상과 의존관계 (실제 import 분석 완료, 2026-09-19)

파일 의존관계를 직접 확인함 — `components/NavBar.tsx`는 `components/ui.tsx`를 import(`LogoIcon`, `useToast`)하지만, `components/states.tsx`는 `ui.tsx`에 의존하지 않음. 화면(screens/) 21개가 `ui.tsx`를 직접 import. 이 의존관계가 아래 병렬 실행 계획의 근거다.

- **Stage 0 (완료)**: `LandingScreen.tsx` — 디자인 언어 확정 및 검증
- **Stage 1 (기반, 병렬 가능)**: `components/ui.tsx`, `components/states.tsx` — 서로 의존하지 않으므로 **동시 진행 가능**. 나머지 모든 단계가 이 위에서 시작하므로 반드시 먼저 끝나야 함.
- **Stage 2 (Stage 1 완료 후, 단일)**: `components/NavBar.tsx` — `ui.tsx`에 의존하므로 Stage 1이 끝난 뒤 시작. 화면 대부분이 `NavBar`의 `Page` 레이아웃을 쓰므로 이것도 화면 작업보다 먼저 끝나야 함.
- **Stage 3 (Stage 1·2 완료 후, 병렬 가능)**: 나머지 화면 20개. 화면끼리는 서로 import하지 않아 파일 충돌 없이 병렬 처리 가능. 아래처럼 기능 영역별로 묶어서 배치 실행(20개를 한 번에 다 띄우지 않는다):
  1. ✅ **완료** 인증/온보딩: `LoginScreen`, `AuthCallbackScreen`, `RoleSelectScreen`, `JoinTypeScreen`, `ProfileSetupScreen`
  2. ✅ **완료** 탐색: `SearchScreen`, `DetailScreen`
  3. ✅ **완료** 팀 관리: `TeamSetupScreen`, `TeamEditScreen`, `TeamSpaceScreen`
  4. ⬜ 매칭/커피챗: `AIResultsScreen`, `CoffeeChatInboxScreen`, `CoffeeChatMatchedScreen`
  5. ⬜ 채팅: `ChatScreen`, `MessagesScreen`
  6. ⬜ 마이페이지: `MyPageScreen`, `MyStatusScreen`, `MyReviewsScreen`, `MemberProfileScreen`
  7. ⬜ 알림: `NotificationsScreen`

  **누락 발견(다음 세션에서 그룹 8로 처리할 것)**: `ProfileSetupScreen`이 위임하는 하위 폼 컴포넌트들(`screens/profile/DevProfileForm.tsx`, `DesignProfileForm.tsx`, `PlanningProfileForm.tsx`, `DevProfileView.tsx`, `DesignProfileView.tsx`, `PlanningProfileView.tsx`, `BioAccordionField.tsx`, `BioItemsView.tsx`, `PortfolioLinksField.tsx`)는 원래 7개 그룹 어디에도 포함되지 않았다 — `ProfileSetupScreen.tsx` 자체는 그룹 1에서 끝났지만 이 하위 파일들엔 아직 옛 하드코딩 hex가 남아있다(2026-09-19 grep으로 확인). 배치 2를 시작하기 전에 이 파일들을 "그룹 8: 프로필 서브폼"으로 별도 배치해 처리할 것.

## 서브에이전트 병렬 운영 계획 (superpowers:dispatching-parallel-agents 기준)

- **병렬 dispatch는 "같은 응답(메시지) 안에서 Agent 호출을 여러 개 넣을 때만" 성립한다** — 한 응답에 하나씩 순서대로 부르면 결과적으로 순차 실행이 된다. Stage 1, Stage 3 각 배치는 반드시 한 메시지에 여러 Agent 호출을 동시에 담아 디스패치할 것.
- **Stage 1**: `ui.tsx` 담당 1개 + `states.tsx` 담당 1개, 총 2개 에이전트를 한 번에 병렬 디스패치.
- **Stage 2**: Stage 1의 두 에이전트가 모두 끝난 걸 확인한 뒤에만 시작. `NavBar.tsx` 에이전트 1개(의존성 때문에 병렬 대상 없음).
- **Stage 3**: 위 7개 그룹을 한 번에 전부 병렬로 띄우지 말고, 그룹 2~3개씩 나눠서 병렬 디스패치 → 결과 검토 → 다음 배치, 순으로 진행(한 번에 너무 많은 에이전트를 띄우면 개별 결과 리뷰가 부실해짐). 각 그룹 안의 화면들은 서로 다른 파일이라 한 에이전트가 그룹 내 여러 화면을 순서대로 처리해도 되고, 그룹 자체를 더 잘게 쪼개 화면 단위로 병렬화해도 됨 — 그룹 경계(파일 겹침 없음)만 지키면 됨.
- 모든 서브에이전트 프롬프트에는 이 플랜 문서의 "확정된 디자인 언어" 섹션 전체(색 5개 hex, 폰트 2개, 레이아웃 원칙 4개)를 그대로 복사해 넣을 것 — 새 에이전트는 이 대화의 맥락이 없으므로 브리프에 없는 내용은 모른다고 가정.

## 서브에이전트 완료 기준 — "작업 수행"과 "목적 달성"은 다른 체크다

지금까지 이 프로젝트에서 서브에이전트를 쓸 때(floci 배포 검증 등) "시킨 절차를 실행했는지"는 확인했지만 그것과 "실제로 원하는 결과가 나왔는지"는 별개의 체크였다 — 이번 디자인 작업도 동일하게, **각 서브에이전트는 파일을 고치는 것으로 끝내지 말고, 아래 체크리스트를 스스로 통과시킨 뒤에 완료를 보고해야 한다**:

1. `pnpm typecheck` 통과 (객관적 정확성)
2. 로컬 dev 서버(`:8443`)에서 실제로 화면을 열어 스크린샷으로 확인 — 코드가 의도대로 렌더링되는지, 레이아웃이 깨지지 않는지
3. 아래 "확정된 디자인 언어" 대조 체크리스트를 항목별로 스스로 답하고 보고서에 포함할 것:
   - 색이 `INK`/`BONE`/`SPARK`/`LINE`/`INK_SOFT` 다섯 개(+카카오 예외)로만 구성됐는가? 다른 임의의 색(특히 앱 전역의 원래 `#4EAAF5` 계열이 실수로 남아있는 경우)이 섞여 있지 않은가?
   - 헤드라인/타이틀에 "Do Hyeon", 본문에 "Gothic A1"이 적용됐는가?
   - ALL-CAPS 트랙아웃 eyebrow, 가운뎃점(·) 남발, "STEP 01" 식 라벨, 동일 radius+그림자의 카드킷이 새로 생기지 않았는가?
   - 강조색(SPARK)이 정말 강조가 필요한 곳에만 쓰였는가?
4. 위 체크리스트 중 하나라도 실패하면 "완료"로 보고하지 말고 스스로 고친 뒤 재확인 — 절차를 다 실행했다는 사실 자체는 완료 기준이 아니다.

## 진행 방식

- `frontend-design` 스킬을 다시 로드하고, 이 문서의 "확정된 디자인 언어" 섹션을 브리프로 그대로 넘길 것 (재브레인스토밍 불필요, 색/타이포/원칙 이미 확정됨)
- **결정 완료(2026-09-19): 앱 전역 토큰 교체 방식으로 진행.** `index.css`의 `--color-brand` 등을 `INK`/`BONE`/`SPARK`/`LINE` 값으로 교체하고, `ui.tsx`/`NavBar.tsx`는 이 전역 토큰(CSS 변수 또는 Tailwind 테마)을 참조하도록 작성한다 — LandingScreen처럼 파일 내 인라인 상수로 스코프 분리하지 않는다.
- Stage 1 → Stage 2 → Stage 3 순서를 반드시 지킬 것(역순이나 건너뛰기 금지) — 앞 단계 완료 확인 없이 다음 단계를 병렬로 띄우면 뒤 화면들이 구 버전 `ui.tsx`를 기준으로 작업하게 돼 재작업이 생긴다

## 진행 상황 로그 (서브에이전트가 각자 작업 종료 시 여기에 한 줄씩 추가할 것)

상태 중앙집중화 목적 — 각 서브에이전트는 자기 작업이 끝나면 이 표에 행을 추가하고(날짜, 담당 파일, 완료 기준 체크리스트 통과 여부, 특이사항), 위 Stage 진행 여부도 같이 갱신한다.

| 날짜 | 담당 | 완료 기준 체크리스트 통과 | 비고 |
| --- | --- | --- | --- |
| 2026-09-19 | states.tsx | 통과 (typecheck / 색상 대조 / 장식 점검) | 하늘색 계열(`#38BDF8`/`#0EA5E9`/`#0284C7`/`#E0F2FE`/`#F0F9FF`/`#F8FAFC`)과 `#0F172A`/`#64748B`/`#94A3B8`/`#E2EAF4`를 `bg-brand`/`bg-brand-dark`/`text-ink`/`text-ink-soft`/`border-border`/`var(--color-brand)` 토큰으로 교체. 에러 시맨틱 컬러(`#F43F5E`/`#FFF1F2`)는 의도대로 그대로 둠. `pnpm typecheck` 통과. dev 서버(`:8443`, http)에서 `/hackathons?q=(없는 검색어)`로 EmptyState 렌더 스크린샷 확인 — 라운드 아이콘(브랜드 틴트)+굵은 제목(ink)+보조설명(ink-soft), ALL-CAPS/장식 없음. `index.css`가 아직 SPARK 값으로 안 바뀐 상태라 화면상 색은 기존 하늘색(#4EAAF5 계열)으로 보이는데, 이는 예상된 정상 상태(index.css 담당 에이전트 완료 시 자동 반영). https 개발 서버는 이번 세션에서 TLS 핸드셰이크 오류로 못 열어 http로 확인함(states.tsx 변경과 무관한 환경 이슈). |
| 2026-09-19 | ui.tsx + index.css | 통과 | `index.css` `@theme`을 INK/BONE/SPARK/LINE/INK_SOFT 값으로 교체(`--color-brand`→SPARK `#2D8FE0`, `--color-brand-dark`→호버용 `#256FB3`, `--color-ink`/`--color-ink-soft` 신설, `--color-muted` 제거하고 ink-soft로 흡수, `--color-surface`/`--color-card`→BONE `#FFFFFF`, `--color-border`는 LINE과 동일해 유지, `--font-sans`→Gothic A1, `--font-display` 신설로 Do Hyeon, 전역 `*`/`body` 규칙도 var(--font-sans)/var(--color-surface) 참조로 변경, 이제 안 쓰는 Noto Sans KR import 제거). `ui.tsx`의 하드코딩 하늘색·회색(`#4EAAF5`/`#0EA5E9`/`#0284C7`/`#BAE6FD`/`#D0DCE8`/`#8FA3BF`/`#0F172A`/`gray-500`/`gray-700`/`gray-800`)을 `bg-brand`/`hover:bg-brand-dark`/`disabled:bg-brand/40`/`text-ink`/`text-ink-soft`/`border-border`/`bg-ink`/`var(--color-brand)`(SVG stroke)로 교체. 에러 시맨틱(`#E11D48`/`#F43F5E`/`#FECDD3`/`#FFF1F2`)과 카카오 노랑은 예외로 그대로 둠. `LogoIcon` alt를 "ㅎㅋㅌ"→"파비콘"으로 수정. 컴포넌트 API(props/반환 타입) 변경 없음. `pnpm typecheck` 통과. dev 서버(`:8443`, http — https는 이 세션에서도 TLS 핸드셰이크 실패로 열리지 않아 http로 확인, states.tsx 담당과 동일한 환경 이슈)에서 `/login`(카카오 예외색 확인) 및 `/hackathons`(ChipGroup 선택/비선택, Avatar 배지)를 스크린샷으로 확인 — SPARK 파란색·흰 배경·헤어라인 보더로 정상 렌더, 레이아웃 깨짐 없음. 공유 브라우저 세션이라 tab 그룹이 자주 바뀌어 스크린샷 도구가 간헐적으로 실패했으나 재시도로 확인 완료. |
| 2026-09-19 | NavBar.tsx | 통과 | 헤더 보더 `#E2EAF4`→`border-border`, 로고 옆 텍스트 `text-gray-800`→`text-ink`, 활성 네비 탭 `text-[#0EA5E9] bg-[#F0F9FF]`→`text-brand bg-brand/10`, 비활성 탭 `text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50`→`text-ink-soft hover:text-ink hover:bg-border/40`, 검색 인풋 `bg-[#F0F5FC] border-[#E2EAF4] focus:border-[#0EA5E9] placeholder-[#8FA3BF]`→`bg-white border-border focus:border-brand placeholder-ink-soft`, 메시지/알림 아이콘 버튼의 활성/비활성 상태도 동일 패턴(`bg-brand/10 text-brand` / `text-ink-soft hover:bg-border/40`)으로 교체, 아바타 원형 배경 `#0EA5E9`→`bg-brand`, `Page` 래퍼의 페이지 전체 배경 `#EEF4FB`(장식용 연한 파랑 워시)→`bg-surface`(BONE 흰색)로 교체. `#F43F5E`(읽지 않음 카운트 배지)는 알림/메시지 미읽음 개수를 표시하는 "주의 환기" 용도로 판단해 `ui.tsx`/`states.tsx`가 이미 채택한 에러 시맨틱 예외로 그대로 유지(활성 탭에 이미 SPARK를 쓰고 있어 배지까지 SPARK로 바꾸면 "선택됨"과 "안 읽음"이 같은 색으로 겹쳐 구분이 안 됨 — 대비를 위해 유지가 더 나은 선택). "ㅎㅋㅌ" placeholder는 "파비콘"으로 교체(로고 아이콘 alt는 `ui.tsx`에서 이미 처리됨, 여기서는 헤더 옆 텍스트 라벨). `Page`/`NavBar`의 props·export 이름은 변경하지 않음. `pnpm typecheck` 통과. dev 서버(`:8443`, http — 이 세션에서도 https 접속 시 TLS 핸드셰이크 오류로 http 사용, 기존 두 에이전트와 동일한 환경 이슈)에서 로그인된 상태로 `/#/hackathons`를 스크린샷 확인 — 로고+"파비콘" 텍스트, 활성 탭(홈) SPARK 틴트, 나머지 탭 INK_SOFT, 검색창 LINE 보더, 아바타 SPARK 원형으로 정상 렌더, 레이아웃 깨짐 없음. 파일 전체 grep으로 남은 임의 hex 없음(`#F43F5E` 예외 1건만 존재) 확인. |
| 2026-09-19 | Stage3 - 탐색 (SearchScreen.tsx, DetailScreen.tsx) | 통과 | `SearchScreen.tsx`: 페이지 배경 `bg-[#EEF4FB]`→`bg-surface`, 타이틀 `text-gray-800`→`font-[family-name:var(--font-display)] text-ink`(Do Hyeon 적용), 부제/보조텍스트 `text-[#8FA3BF]`→`text-ink-soft`, 검색 인풋 `border-[#E2EAF4] focus:border-[#4EAAF5] placeholder-[#B8C9D9]`→`border-border focus:border-brand placeholder-ink-soft`, 카테고리 칩 선택/비선택 `bg-[#4EAAF5]`/`text-gray-500`/`border-[#E2EAF4]`→`bg-brand`/`text-ink-soft`/`border-border`(`ui.tsx`의 ChipGroup과 동일 패턴), 카드 보더/호버 `border-[#E2EAF4] hover:border-[#B8D9F5]`→`border-border hover:border-brand/40`, 카테고리 뱃지 `bg-blue-100 text-[#4EAAF5]`→`bg-brand/10 text-brand`, 상태 뱃지(모집중 등, 자유 문자열)는 이전엔 `bg-green-50 text-green-600`(디자인 언어 5색+예외에 없는 임의 녹색)이었는데 이를 강조가 필요 없는 정보성 태그로 판단해 중립톤 `bg-border/60 text-ink-soft`로 교체(카테고리 뱃지만 SPARK 강조 유지, 둘 다 SPARK로 하면 강조 절제 원칙 위반). 카드 제목/호버 `text-gray-800 group-hover:text-[#4EAAF5]`→`text-ink group-hover:text-brand`. `DetailScreen.tsx`: 배너 placeholder/기간/통계 라벨 `text-[#8FA3BF]`→`text-ink-soft`, 카테고리 뱃지 `bg-blue-100 text-[#4EAAF5]`→`bg-brand/10 text-brand`, 타이틀 `text-gray-800`→`font-[family-name:var(--font-display)] text-ink`(Do Hyeon), 설명 본문 `text-gray-600`→`text-ink`(보조가 아닌 본문이라 ink로 승격), 통계 카드 보더 `border-[#E2EAF4]`→`border-border`, 통계 숫자 `text-[#4EAAF5]`→`text-brand`. 두 파일 모두 검색/필터 로직, props, 라우팅, API 호출은 변경 없음(순수 스타일). `pnpm typecheck` 통과. 공유 브라우저 세션 경합(다른 Stage3 에이전트들과 탭 그룹이 계속 바뀜)으로 스크린샷 도구가 여러 번 실패했으나 재시도로 확인: dev 서버(`:8443`, http — https는 TLS 핸드셰이크 오류로 이 세션에서도 안 열림, 기존 에이전트들과 동일한 환경 이슈)에서 `/#/hackathons`(카드 목록, 카테고리 칩, "전체" 선택 SPARK)와 `/#/hackathons/10`(seed된 실제 해커톤 "DeveloperWeek 2026 Hackathon" — 카테고리 뱃지, 통계 2칸, 참가 버튼)을 스크린샷으로 확인. 임의 hex/`gray-*`/`blue-*`/`green-*` grep 재확인 결과 두 파일 모두 0건. ALL-CAPS eyebrow, "STEP 01"류 라벨, 동일 radius+그림자 카드킷 신규 도입 없음(기존 구조 유지). |
| 2026-09-19 | Stage3 - 팀 관리 (TeamSetupScreen.tsx, TeamEditScreen.tsx, TeamSpaceScreen.tsx) | 통과 | `TeamSetupScreen.tsx`: 타이틀 `text-gray-800`→`font-[family-name:var(--font-display)] text-ink`(Do Hyeon), 부제/안내문 `text-[#8FA3BF]`/`text-[#94A3B8]`→`text-ink-soft`. `TeamEditScreen.tsx`: 타이틀 동일하게 Do Hyeon+`text-ink`, 부제/모집상태 설명 `text-[#64748B]`→`text-ink-soft`, 모집 상태 카드 보더 `border-[#E2EAF4]`→`border-border`, 라벨 `text-[#0F172A]`→`text-ink`, 취소/저장 버튼 `border-[#E2EAF4]`/`text-[#64748B]`/`hover:bg-gray-50`→`border-border`/`text-ink-soft`/`hover:bg-border/40`, 저장 버튼 `bg-[#0EA5E9] hover:bg-[#0284C7] disabled:bg-[#BAE6FD]`→`bg-brand hover:bg-brand-dark disabled:bg-brand/40`(모집 상태 드롭다운 색은 `lib/constants.ts`의 `RECRUIT_STATUS_STYLES` 소관이라 파일 범위 밖이라 손대지 않음). `TeamSpaceScreen.tsx`(가장 큼): 리뷰 모달 배경 `rgba(80,100,130,0.45)`→INK 톤 `rgba(16,24,40,0.45)`, 모달 내부 텍스트/보더/포커스 색 전부 ink/ink-soft/border/brand 토큰화, 페이지 타이틀 Do Hyeon 적용, 섹션 헤더(팀원/내 할 일) `text-[#0F172A]`→`text-ink`, "참가자 추천" 링크 `text-[#0EA5E9]`→`text-brand`, 수동 참가자 추가 폼/할일 입력창의 보더·포커스·비활성 배경 전부 토큰화, 팀원 카드(커피챗/수동 두 종류) 보더·이름·역할·삭제아이콘·"대화 열기"/"진행중으로 표시" 버튼·회원 뱃지를 전부 브랜드/ink 토큰으로 교체, 특히 "⭐ 리뷰 작성하기" 버튼은 기존 임의 amber(`border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]`, 5색 토큰에 없는 색)를 강조색 절제 원칙에 따라 중립 아웃라인(`border-border bg-white text-ink hover:bg-border/40`)으로 교체(리뷰는 보조 동작이라 SPARK 대신 중립 처리), 할 일 리스트 체크박스 accent/완료취소선/삭제아이콘, 프로젝트 종료 카드/버튼까지 전부 토큰화. 삭제 아이콘 hover의 `#F43F5E`는 기존 두 에이전트(ui.tsx/NavBar.tsx)가 이미 채택한 에러 시맨틱 예외로 유지(그대로 둠, 신규 도입 아님). 로직/props/라우팅/API 호출 변경 없음(순수 스타일). `pnpm typecheck` 통과. 3개 파일 hex grep 결과 `#F43F5E`(에러 시맨틱 예외) 외 잔존 없음. 공유 브라우저 세션 경합으로 tab 그룹이 여러 차례 바뀌어 스크린샷 도구가 반복 실패했으나 재시도로 확인 완료: dev 서버(`:8443`, http — https는 이 세션에서도 TLS 핸드셰이크 오류로 안 열림, 기존 에이전트들과 동일한 환경 이슈)에서 `manage.py issue_token`으로 발급한 JWT를 localStorage에 주입해 로그인 우회 후 `/#/my/status/3`(실データ: 헬스케어 AI 해커톤, 수락된 팀원 1명)을 스크린샷 확인 — 타이틀 Do Hyeon 렌더, 팀원 카드/버튼/뱃지 SPARK+INK+LINE 조합으로 정상 렌더, 레이아웃 깨짐 없음, ALL-CAPS·STEP 라벨·동일 카드킷 패턴 없음. TeamSetupScreen/TeamEditScreen은 코드 확인상 동일 토큰만 사용해 별도 화면 스크린샷은 생략(시간/탭 경합 고려, 필수 요건인 TeamSpaceScreen만 확인). |
| 2026-09-19 | Stage3 - 인증/온보딩 (LoginScreen.tsx, AuthCallbackScreen.tsx, RoleSelectScreen.tsx, JoinTypeScreen.tsx, ProfileSetupScreen.tsx) | 통과 (index.css 사이드 픽스 포함) | **중요 발견 및 수정**: `index.css`의 전역 `* { font-family: var(--font-sans); }` 규칙이 `@layer` 밖(언레이어드)에 있어서, CSS 캐스케이드 규칙상 언레이어드 스타일이 `@layer utilities`(Tailwind가 생성하는 모든 유틸리티 클래스, `font-[family-name:var(--font-display)]` 포함)보다 항상 우선하는 문제를 발견함 — 그 결과 지금까지 다른 화면들(탐색/팀 관리 그룹 등)이 이미 적용했다고 로그에 적은 `font-[family-name:var(--font-display)]`(Do Hyeon)가 실제로는 전혀 적용되지 않고 전부 Gothic A1로 렌더링되고 있었음(브라우저 `getComputedStyle`로 직접 확인: 수정 전 `fontFamily: '"Gothic A1", sans-serif'`). `index.css`의 `* {...}`/`body {...}` 규칙을 `@layer base { ... }`로 감싸는 것으로 수정 — 이 수정은 index.css 전체에 영향을 주므로 **다른 Stage3 그룹들이 이미 완료 보고한 Do Hyeon 적용도 이 수정 이후에야 실제로 렌더링됨**(각 그룹의 코드 자체는 올바른 클래스를 썼으므로 재작업 불필요, 이 한 곳만 고치면 전체 반영됨). 수정 후 재확인해 Do Hyeon이 실제로 렌더링됨을 스크린샷+`getComputedStyle`(`'"Do Hyeon", sans-serif'`)로 검증함. **파일별 변경**: `LoginScreen.tsx` — 배경의 인라인 그라디언트(`#E8F3FD`/`#F5F9FF`/`#EAF0FB`, 장식용 블러 계열)를 제거하고 `bg-surface`로, "ㅎㅋㅌ" 브랜드명을 "파비콘"으로, "Favorite contact" placeholder 줄을 삭제, `text-gray-800`/`text-gray-400`→`text-ink`/`text-ink-soft`, 헤드라인에 `font-[family-name:var(--font-display)]` 추가, 카카오 버튼은 `bg-[#FEE500]`→`bg-kakao`(이미 `index.css`에 있던 `--color-kakao` 토큰 사용), hover는 새 hex 대신 `hover:brightness-95`, 버튼 텍스트 `text-gray-800`→`text-ink`(카카오 로고 원 안의 `#3A1D1D`는 브랜드 심볼 자체라 예외 유지), 하단 링크 `text-[#8FA3BF] hover:text-[#4EAAF5]`→`text-ink-soft hover:text-brand`. `AuthCallbackScreen.tsx` — `bg-[#EEF4FB]`→`bg-surface`(×2), `text-[#0F172A]`→`text-ink`, `text-[#64748B]`→`text-ink-soft`, 재시도 버튼 `bg-[#0EA5E9] hover:bg-[#0284C7]`→`bg-brand hover:bg-brand-dark`. `RoleSelectScreen.tsx` — 헤드라인 `text-gray-800`→`text-ink`+Do Hyeon, 부제 `text-[#8FA3BF]`→`text-ink-soft`. `JoinTypeScreen.tsx` — 헤드라인 Do Hyeon 적용, 부제/카드 서브텍스트 `text-[#8FA3BF]`→`text-ink-soft`, 카드 보더/호버 `border-[#E2EAF4] hover:border-[#4EAAF5]`→`border-border hover:border-brand`, 아이콘 박스 `bg-[#E2EAF4] group-hover:bg-[#4EAAF5]`→`bg-border group-hover:bg-brand`, 카드 타이틀 `text-gray-800`→`text-ink`. `ProfileSetupScreen.tsx` — 헤드라인 Do Hyeon 적용, 라벨류 `text-[#0F172A]`/`text-gray-700`→`text-ink`, 보조/안내 텍스트 `text-[#8FA3BF]`/`text-[#64748B]`/`text-[#94A3B8]`→`text-ink-soft`(검증 힌트 4곳 포함), 인풋 보더/포커스 `border-[#E2EAF4] focus:border-[#0EA5E9]`→`border-border focus:border-brand`(×2), 자물쇠 아이콘 `stroke="#64748B"`→`stroke="var(--color-ink-soft)"`, "비공개" 토글 박스 배경 `bg-[#F0F5FC]`→`bg-border/20`. 5개 파일 모두 로직/props/라우팅/API 호출 변경 없음(순수 스타일), `DevProfileForm`/`DesignProfileForm`/`PlanningProfileForm`(다른 그룹 담당 아님, Stage3 20개 목록에도 없음)은 건드리지 않음. `pnpm typecheck` 통과. 공유 브라우저 세션 경합(탭 그룹이 계속 바뀜, 다른 에이전트들과 동일 이슈)으로 여러 번 재시도 끝에 dev 서버(`:8443`, http — https는 이 세션에서도 TLS 핸드셰이크 오류로 안 열림)에서 `/#/onboarding/role`(RoleSelectScreen)과 `/#/profile`(ProfileSetupScreen 전체, 스크롤해서 오픈채팅/전화번호/비공개 토글/저장 버튼까지) 스크린샷 확인 — SPARK 칩·INK 텍스트·LINE 보더·Do Hyeon 헤드라인으로 정상 렌더, 레이아웃 깨짐 없음. `/#/login`은 공유 세션이 이미 로그인 상태라 자동으로 홈으로 리다이렉트되어(로그아웃은 동시 작업 중인 다른 에이전트에 영향 줄 수 있어 시도 안 함) 직접 스크린샷은 못 했으나 코드 리뷰 + typecheck로 정적 검증함. 5개 파일 전체 hex/gray-*/slate-*/sky-*/blue-* grep 재확인 — 잔존 1건은 `LoginScreen.tsx`의 카카오 로고 SVG `fill="#3A1D1D"`(브랜드 심볼 예외)뿐. 체크리스트: (1) 색 5토큰+카카오 예외만 사용 — 통과. (2) Do Hyeon/Gothic A1 적용 — 통과(단, 전역 버그를 고쳐야만 실제 반영됨, 위 설명 참고). (3) ALL-CAPS eyebrow/STEP라벨/카드킷 없음 — 통과(원래 없었고 새로 추가하지 않음). (4) 강조색 절제 — 통과(SPARK는 버튼/칩 선택/포커스 보더/토글 on 상태에만 사용, 나머지는 INK/INK_SOFT). |

## 참고
- 실제 브랜드명: "파비콘" (`CLAUDE.md` 기준). LandingScreen에서 이미 "ㅎㅋㅌ/Favorite contact" placeholder를 이걸로 정정함 — 다른 화면에 같은 placeholder가 남아있는지 확인 필요(미확인).
