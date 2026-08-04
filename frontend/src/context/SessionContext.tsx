/**
 * 로그인 사용자와 상단바 배지(알림/메시지 미읽음 수)를 앱 전역에 제공한다.
 *
 * 배지는 여러 화면에서 동시에 필요하고 액션(커피챗 수락, 알림 읽음 등) 직후
 * 갱신되어야 하므로 화면별 useQuery가 아니라 컨텍스트에 둔다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { authApi } from '@/api'
import { setUnauthorizedHandler, tokenStore } from '@/api/client'
import { BADGE_POLL_INTERVAL } from '@/lib/constants'
import { navigate, routes } from '@/lib/router'
import type { Badges, CurrentUser } from '@/types'

interface SessionValue {
  user: CurrentUser | null
  /** 최초 사용자 조회가 끝났는지. false 동안에는 라우팅 판단을 미룬다. */
  ready: boolean
  isAuthenticated: boolean
  badges: Badges
  /** 토큰 저장 후 사용자 정보를 불러온다 (로그인 콜백에서 호출) */
  signIn: (access: string, refresh?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshBadges: () => Promise<void>
  /** 서버 요청 없이 배지를 즉시 조정 (알림 읽음 처리 등) */
  patchBadges: (patch: Partial<Badges>) => void
}

const EMPTY_BADGES: Badges = { unread_notification_count: 0, unread_message_count: 0 }

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [ready, setReady] = useState(false)
  const [badges, setBadges] = useState<Badges>(EMPTY_BADGES)

  // 폴링 타이머 안에서 최신 로그인 여부를 봐야 하므로 ref로 미러링
  const authedRef = useRef(false)
  authedRef.current = user !== null

  const loadUser = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null)
      setBadges(EMPTY_BADGES)
      return
    }
    try {
      const me = await authApi.me()
      setUser(me)
      if (me.badges) setBadges(me.badges)
    } catch {
      // 토큰이 유효하지 않은 경우 — 조용히 비로그인 상태로 둔다
      tokenStore.clear()
      setUser(null)
      setBadges(EMPTY_BADGES)
    }
  }, [])

  const refreshBadges = useCallback(async () => {
    if (!authedRef.current) return
    try {
      setBadges(await authApi.badges())
    } catch {
      // 배지는 부가 정보라 실패해도 화면을 막지 않는다
    }
  }, [])

  const patchBadges = useCallback((patch: Partial<Badges>) => {
    setBadges((prev) => ({ ...prev, ...patch }))
  }, [])

  const signIn = useCallback(
    async (access: string, refresh?: string) => {
      tokenStore.set(access, refresh)
      await loadUser()
    },
    [loadUser],
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // 서버 로그아웃 실패와 무관하게 클라이언트 세션은 정리한다
    }
    tokenStore.clear()
    setUser(null)
    setBadges(EMPTY_BADGES)
    navigate(routes.landing)
  }, [])

  // 최초 1회 사용자 복원
  useEffect(() => {
    loadUser().finally(() => setReady(true))
  }, [loadUser])

  // 401이 떨어지면 로그인 화면으로 되돌린다
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setBadges(EMPTY_BADGES)
      navigate(routes.login, { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // 배지 폴링
  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(refreshBadges, BADGE_POLL_INTERVAL)
    return () => window.clearInterval(timer)
  }, [user, refreshBadges])

  const value = useMemo<SessionValue>(
    () => ({
      user,
      ready,
      isAuthenticated: user !== null,
      badges,
      signIn,
      signOut,
      refreshUser: loadUser,
      refreshBadges,
      patchBadges,
    }),
    [user, ready, badges, signIn, signOut, loadUser, refreshBadges, patchBadges],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}
