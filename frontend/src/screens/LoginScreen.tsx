import { useEffect } from "react"
import { authApi } from "@/api"
import { LogoIcon } from "@/components/ui"
import { useSession } from "@/context/SessionContext"
import { routes, useNavigate } from "@/lib/router"

/**
 * 카카오 로그인 진입 화면.
 *
 * 버튼을 누르면 Django의 `/api/v1/auth/kakao/login/` 으로 **전체 페이지 이동**한다.
 * Django가 카카오 인가 페이지로 리다이렉트하고, 콜백 처리 후
 * `redirect_uri`(= 프론트의 #/auth/callback)로 돌려보낸다.
 */
export function LoginScreen() {
  const navigate = useNavigate()
  const { isAuthenticated, ready } = useSession()

  // 이미 로그인된 상태로 들어오면 바로 홈으로
  useEffect(() => {
    if (ready && isAuthenticated) navigate(routes.hackathons, { replace: true })
  }, [ready, isAuthenticated, navigate])

  const loginWithKakao = () => {
    const redirectTo = `${window.location.origin}${window.location.pathname}#${routes.authCallback}`
    window.location.href = authApi.kakaoLoginUrl(redirectTo)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <LogoIcon size={72} />
        <div className="text-center mt-1">
          <h1 className="text-2xl text-ink tracking-tight font-[family-name:var(--font-display)]">
            파비콘
          </h1>
          <p className="text-[13px] text-ink-soft mt-1.5">
            AI로 만나는 우리 팀, 해커톤 팀 빌딩
          </p>
        </div>

        <button
          onClick={loginWithKakao}
          className="mt-4 flex items-center justify-center gap-2.5 bg-kakao hover:brightness-95 text-ink font-semibold text-[14px] rounded-xl px-16 py-3.5 transition-all shadow-sm"
          style={{ minWidth: 200 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="#3A1D1D" fillOpacity="0.85" />
            <path
              d="M9 4.5C6.52 4.5 4.5 6.1 4.5 8.08c0 1.27.8 2.38 2 3.05l-.48 1.74c-.04.13.1.24.21.16L8.1 11.6a5.3 5.3 0 00.9.07c2.48 0 4.5-1.6 4.5-3.58S11.48 4.5 9 4.5z"
              fill="white"
            />
          </svg>
          카카오로 시작하기
        </button>

        <button
          onClick={() => navigate(routes.hackathons)}
          className="text-[13px] text-ink-soft hover:text-brand transition-colors mt-1"
        >
          로그인 없이 해커톤 둘러보기
        </button>
      </div>
    </div>
  )
}
