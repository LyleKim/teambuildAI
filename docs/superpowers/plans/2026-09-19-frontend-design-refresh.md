# 프론트엔드 디자인 리프레시 — 전체 페이지 적용 플랜

> **상태 (2026-09-19): LandingScreen만 완료. 나머지 화면은 미착수 — 이 파일은 계획만.**

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
  1. 인증/온보딩: `LoginScreen`, `AuthCallbackScreen`, `RoleSelectScreen`, `JoinTypeScreen`, `ProfileSetupScreen`
  2. 탐색: `SearchScreen`, `DetailScreen`
  3. 팀 관리: `TeamSetupScreen`, `TeamEditScreen`, `TeamSpaceScreen`
  4. 매칭/커피챗: `AIResultsScreen`, `CoffeeChatInboxScreen`, `CoffeeChatMatchedScreen`
  5. 채팅: `ChatScreen`, `MessagesScreen`
  6. 마이페이지: `MyPageScreen`, `MyStatusScreen`, `MyReviewsScreen`, `MemberProfileScreen`
  7. 알림: `NotificationsScreen`

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

## 진행 방식 (다음 세션 제안)

- `frontend-design` 스킬을 다시 로드하고, 이 문서의 "확정된 디자인 언어" 섹션을 브리프로 그대로 넘길 것 (재브레인스토밍 불필요, 색/타이포/원칙 이미 확정됨)
- 앱 전역 토큰(`index.css`의 `--color-brand` 등)을 이 값으로 교체할지, 아니면 LandingScreen처럼 스코프 분리를 계속할지는 사용자에게 먼저 확인 — 전역 교체가 더 일관적이지만 한 번에 전체 화면이 바뀌는 리스크가 있음
- Stage 1 → Stage 2 → Stage 3 순서를 반드시 지킬 것(역순이나 건너뛰기 금지) — 앞 단계 완료 확인 없이 다음 단계를 병렬로 띄우면 뒤 화면들이 구 버전 `ui.tsx`를 기준으로 작업하게 돼 재작업이 생긴다

## 참고
- 실제 브랜드명: "파비콘" (`CLAUDE.md` 기준). LandingScreen에서 이미 "ㅎㅋㅌ/Favorite contact" placeholder를 이걸로 정정함 — 다른 화면에 같은 placeholder가 남아있는지 확인 필요(미확인).
