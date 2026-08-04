import { useEffect, useRef, useState } from 'react'
import { authApi } from '@/api'
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
        navigate(routes.hackathons, { replace: true })
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
