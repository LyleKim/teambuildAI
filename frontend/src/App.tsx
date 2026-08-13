import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { LoadingState } from '@/components/states'
import { useSession } from '@/context/SessionContext'
import { numericParam, routes, useLocation, useMatchedRoute, useNavigate } from '@/lib/router'
import { AIResultsScreen } from '@/screens/AIResultsScreen'
import { AuthCallbackScreen } from '@/screens/AuthCallbackScreen'
import { ChatScreen } from '@/screens/ChatScreen'
import { CoffeeChatInboxScreen } from '@/screens/CoffeeChatInboxScreen'
import { CoffeeChatMatchedScreen } from '@/screens/CoffeeChatMatchedScreen'
import { DetailScreen } from '@/screens/DetailScreen'
import { JoinTypeScreen } from '@/screens/JoinTypeScreen'
import { LandingScreen } from '@/screens/LandingScreen'
import { LoginScreen } from '@/screens/LoginScreen'
import { MemberProfileScreen } from '@/screens/MemberProfileScreen'
import { MessagesScreen } from '@/screens/MessagesScreen'
import { MyPageScreen } from '@/screens/MyPageScreen'
import { MyStatusScreen } from '@/screens/MyStatusScreen'
import { NotificationsScreen } from '@/screens/NotificationsScreen'
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen'
import { SearchScreen } from '@/screens/SearchScreen'
import { TeamEditScreen } from '@/screens/TeamEditScreen'
import { TeamSetupScreen } from '@/screens/TeamSetupScreen'
import { TeamSpaceScreen } from '@/screens/TeamSpaceScreen'
import { MyReviewsScreen } from '@/screens/MyReviewsScreen'

type Params = Record<string, string>

interface RouteDef {
  render: (params: Params) => ReactNode
  /** 로그인이 필요한 화면인지 */
  auth: boolean
}

/**
 * 라우트 테이블.
 *
 * 위에서부터 순서대로 매칭되므로, 더 구체적인 패턴을 먼저 둔다.
 * (예: `/hackathons/:id/join` 이 `/hackathons/:id` 보다 앞)
 */
const ROUTE_TABLE: { pattern: string; value: RouteDef }[] = [
  { pattern: '/', value: { render: () => <LandingScreen />, auth: false } },
  { pattern: '/login', value: { render: () => <LoginScreen />, auth: false } },
  { pattern: '/auth/callback', value: { render: () => <AuthCallbackScreen />, auth: false } },

  { pattern: '/hackathons', value: { render: () => <SearchScreen />, auth: false } },
  {
    pattern: '/hackathons/:id/join',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <JoinTypeScreen hackathonId={id} />} />, auth: true },
  },
  {
    pattern: '/hackathons/:id/profile-setup',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <ProfileSetupScreen hackathonId={id} />} />, auth: true },
  },
  {
    pattern: '/hackathons/:id/team-setup',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <TeamSetupScreen hackathonId={id} />} />, auth: true },
  },
  {
    pattern: '/hackathons/:id/recommendations',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <AIResultsScreen hackathonId={id} />} />, auth: true },
  },
  {
    pattern: '/hackathons/:id',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <DetailScreen hackathonId={id} />} />, auth: false },
  },

  { pattern: '/profile', value: { render: () => <ProfileSetupScreen hackathonId={null} />, auth: true } },
  {
    pattern: '/users/:id',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <MemberProfileScreen userId={id} />} />, auth: true },
  },

  { pattern: '/coffeechats', value: { render: () => <CoffeeChatInboxScreen />, auth: true } },
  {
    pattern: '/coffeechats/:id/matched',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <CoffeeChatMatchedScreen coffeechatId={id} />} />, auth: true },
  },

  { pattern: '/messages', value: { render: () => <MessagesScreen />, auth: true } },
  {
    pattern: '/messages/:id',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <ChatScreen threadId={id} />} />, auth: true },
  },

  { pattern: '/my/status', value: { render: () => <MyStatusScreen />, auth: true } },
  {
    pattern: '/my/status/:id',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <TeamSpaceScreen hackathonId={id} />} />, auth: true },
  },
  {
    pattern: '/teams/:id/edit',
    value: { render: (p) => <Guarded id={numericParam(p, 'id')} render={(id) => <TeamEditScreen teamId={id} />} />, auth: true },
  },
  { pattern: '/mypage/reviews', value: { render: () => <MyReviewsScreen />, auth: true } },
  { pattern: '/mypage', value: { render: () => <MyPageScreen />, auth: true } },
  { pattern: '/notifications', value: { render: () => <NotificationsScreen />, auth: true } },
]

/** URL 파라미터가 숫자가 아닌 경우를 화면 진입 전에 걸러낸다. */
function Guarded({ id, render }: { id: number | null; render: (id: number) => ReactNode }) {
  if (id === null) return <NotFound message="잘못된 주소예요." />
  return <>{render(id)}</>
}

function NotFound({ message = '페이지를 찾을 수 없어요.' }: { message?: string }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#EEF4FB] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[48px]">🤔</p>
      <p className="text-[18px] font-bold text-[#0F172A]">{message}</p>
      <button
        onClick={() => navigate(routes.hackathons)}
        className="mt-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[14px] px-8 py-3 rounded-xl transition-colors"
      >
        홈으로 가기
      </button>
    </div>
  )
}

export default function App() {
  const { path } = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, ready } = useSession()

  const matched = useMatchedRoute(ROUTE_TABLE)

  // 해시가 아예 없는 첫 진입(`http://localhost:8443/`)을 랜딩으로 고정한다
  useEffect(() => {
    if (!window.location.hash) navigate(routes.landing, { replace: true })
  }, [navigate])

  const needsAuth = matched?.value.auth ?? false

  // 로그인이 필요한 화면인데 비로그인이면 로그인 화면으로
  useEffect(() => {
    if (ready && needsAuth && !isAuthenticated) {
      navigate(routes.login, { replace: true })
    }
  }, [ready, needsAuth, isAuthenticated, navigate])

  // 사용자 복원이 끝나기 전에 보호 화면을 그리면 깜빡임이 생긴다
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#EEF4FB] flex items-center justify-center">
        <LoadingState label="불러오는 중이에요…" />
      </div>
    )
  }

  if (!matched) return <NotFound />
  if (needsAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#EEF4FB] flex items-center justify-center">
        <LoadingState label="로그인 화면으로 이동 중이에요…" />
      </div>
    )
  }

  // path를 key로 줘서 화면 전환 시 폼 상태가 남지 않게 한다
  return <div key={path}>{matched.value.render(matched.params)}</div>
}
