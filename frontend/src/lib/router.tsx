/**
 * 의존성 없는 초경량 해시 라우터.
 *
 * `#/hackathons/3/recommendations` 형태의 URL을 사용해서
 *  - 새로고침해도 현재 화면이 유지되고
 *  - 브라우저 뒤로가기가 동작하며
 *  - 링크 공유가 가능하다.
 *
 * react-router로 갈아탈 경우 이 파일과 App.tsx의 라우트 테이블만 바꾸면 된다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface RouteLocation {
  /** 해시에서 쿼리를 제외한 경로. 항상 '/'로 시작한다. */
  path: string
  query: URLSearchParams
}

function readLocation(): RouteLocation {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, search = ''] = raw.split('?')
  return {
    path: path.startsWith('/') ? path : `/${path}`,
    query: new URLSearchParams(search),
  }
}

const RouterContext = createContext<RouteLocation>({ path: '/', query: new URLSearchParams() })

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<RouteLocation>(readLocation)

  useEffect(() => {
    const onChange = () => setLocation(readLocation())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return <RouterContext.Provider value={location}>{children}</RouterContext.Provider>
}

export function useLocation() {
  return useContext(RouterContext)
}

export interface NavigateOptions {
  /** 히스토리에 새 항목을 쌓지 않고 현재 항목을 교체한다 */
  replace?: boolean
}

export function navigate(to: string, options: NavigateOptions = {}) {
  const target = to.startsWith('/') ? to : `/${to}`
  const nextHash = `#${target}`

  if (window.location.hash === nextHash) return

  if (options.replace) {
    const url = `${window.location.pathname}${window.location.search}${nextHash}`
    window.history.replaceState(null, '', url)
    // replaceState는 hashchange를 발생시키지 않으므로 직접 알린다
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = nextHash
  }
}

export function useNavigate() {
  return useCallback((to: string, options?: NavigateOptions) => navigate(to, options), [])
}

/**
 * '/hackathons/:id' 같은 패턴을 현재 경로와 대조해 파라미터를 뽑는다.
 * 매치되지 않으면 null.
 */
export function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = path.split('/').filter(Boolean)

  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(pathParts[i])
    } else if (p !== pathParts[i]) {
      return null
    }
  }
  return params
}

/** 라우트 테이블에서 현재 경로에 맞는 항목 하나를 고른다. */
export function useMatchedRoute<T>(
  routes: { pattern: string; value: T }[],
): { value: T; params: Record<string, string> } | null {
  const { path } = useLocation()

  return useMemo(() => {
    for (const route of routes) {
      const params = matchPath(route.pattern, path)
      if (params) return { value: route.value, params }
    }
    return null
    // routes는 모듈 스코프 상수라 path만 의존성으로 충분하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
}

/** 경로 파라미터를 숫자로 파싱. 유효하지 않으면 null. */
export function numericParam(params: Record<string, string>, key: string): number | null {
  const value = Number(params[key])
  return Number.isFinite(value) && value > 0 ? value : null
}

export function Link({
  to,
  className,
  children,
  onClick,
}: {
  to: string
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <a
      href={`#${to.startsWith('/') ? to : `/${to}`}`}
      className={className}
      onClick={() => onClick?.()}
    >
      {children}
    </a>
  )
}

/** 앱 전역에서 쓰는 경로 빌더. 경로 문자열을 여기저기 흩뿌리지 않기 위함. */
export const routes = {
  landing: '/',
  login: '/login',
  authCallback: '/auth/callback',
  hackathons: '/hackathons',
  hackathon: (id: number) => `/hackathons/${id}`,
  join: (id: number) => `/hackathons/${id}/join`,
  profileSetup: (id: number) => `/hackathons/${id}/profile-setup`,
  teamSetup: (id: number) => `/hackathons/${id}/team-setup`,
  recommendations: (id: number) => `/hackathons/${id}/recommendations`,
  member: (userId: number) => `/users/${userId}`,
  /** 해커톤 컨텍스트 없이 프로필만 수정할 때 (마이페이지 진입) */
  profile: '/profile',
  coffeechats: '/coffeechats',
  coffeechatMatched: (id: number) => `/coffeechats/${id}/matched`,
  messages: '/messages',
  thread: (id: number) => `/messages/${id}`,
  myStatus: '/my/status',
  teamSpace: (hackathonId: number) => `/my/status/${hackathonId}`,
  teamEdit: (id: number) => `/teams/${id}/edit`,
  mypage: '/mypage',
  myReviews: '/mypage/reviews',
  notifications: '/notifications',
} as const
