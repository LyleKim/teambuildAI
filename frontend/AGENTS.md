# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; wraps `App` with `RouterProvider` + `SessionProvider`
- `src/App.tsx` - Route table and auth guard. Add a screen by adding one row here
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `src/types/index.ts` - API 응답 타입. Django 시리얼라이저와 1:1 (snake_case 유지)
- `src/api/client.ts` - fetch 래퍼. 토큰 저장/갱신, CSRF, 에러 정규화
- `src/api/index.ts` - 기능별 엔드포인트 모듈. **컴포넌트는 fetch를 직접 호출하지 않는다**
- `src/hooks/` - `useQuery`(조회) / `useMutation`(변경) / `useMetaOptions`(선택지)
- `src/context/SessionContext.tsx` - 로그인 사용자와 상단바 배지(알림/메시지 미읽음)
- `src/lib/router.tsx` - 의존성 없는 해시 라우터. 경로는 `routes` 빌더로만 참조
- `src/lib/constants.ts` - 선택지 기본값, 배지/상태 스타일 맵, 폴링 주기
- `src/components/` - `NavBar`(+`Page` 레이아웃), `ui.tsx`(프리미티브), `states.tsx`(로딩/에러/빈 상태)
- `src/screens/` - 화면 컴포넌트. 파일 하나가 라우트 하나에 대응
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite config + **Django 프록시 설정**, `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Backend integration

프론트는 데이터를 하드코딩하지 않고 전부 백엔드에서 가져온다.

- 모든 요청은 `/api/v1` 로 나가고, Vite dev 서버가 `http://127.0.0.1:8000` (Django)로 프록시한다.
- 프록시 대상: `/api`, `/admin`, `/static`, `/media`, `/ws`. `vite.config.ts` 의 `proxy` 참고.
- Django 포트를 바꾸려면 `DJANGO_ORIGIN=http://127.0.0.1:9000 pnpm dev`, 또는 `frontend/.env`(커밋 안 됨)에 `DJANGO_ORIGIN=...`을 적어두면 매번 안 붙여도 된다.
- 인증은 JWT Bearer. 토큰은 localStorage(`favicon.access_token`)에 저장하고
  401이 나면 `client.ts` 가 refresh 후 1회 재시도한다.
- 백엔드가 꺼져 있으면 `ErrorState` 가 "서버에 연결할 수 없어요" 안내를 띄운다.

새 API를 붙일 때: `src/types/index.ts` 에 타입 추가 → `src/api/index.ts` 에 함수 추가 →
화면에서 `useQuery`/`useMutation` 으로 호출. 이 순서를 지키면 fetch 호출이 흩어지지 않는다.

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
