import { notificationApi } from '@/api'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { useSession } from '@/context/SessionContext'
import { useQuery } from '@/hooks/useQuery'
import { NOTIF_ICON_STYLE } from '@/lib/constants'
import { lastHackathonId } from '@/lib/prefs'
import { routes, useNavigate } from '@/lib/router'
import type { AppNotification } from '@/types'

/** 서버가 준 target/target_id를 실제 라우트로 변환한다. */
function pathFor(n: AppNotification): string {
  switch (n.target) {
    case 'coffeechat-inbox':
      return routes.coffeechats
    case 'coffeechat-matched':
      return n.target_id ? routes.coffeechatMatched(n.target_id) : routes.coffeechats
    case 'ai-results': {
      const id = n.target_id ?? lastHackathonId()
      return id ? routes.recommendations(id) : routes.hackathons
    }
    case 'messages':
      return n.target_id ? routes.thread(n.target_id) : routes.messages
    case 'member-profile':
      return n.target_id ? routes.member(n.target_id) : routes.hackathons
    default:
      return routes.hackathons
  }
}

export function NotificationsScreen() {
  const navigate = useNavigate()
  const { badges, patchBadges, refreshBadges } = useSession()

  const { data, loading, error, refetch, setData } = useQuery('notifications', () =>
    notificationApi.list(),
  )

  const items = data ?? []
  const unread = badges.unread_notification_count

  const open = (n: AppNotification) => {
    if (!n.read) {
      // 낙관적 갱신 — 서버 응답을 기다리지 않고 바로 이동한다
      setData((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      patchBadges({ unread_notification_count: Math.max(0, unread - 1) })
      notificationApi.markRead(n.id).catch(() => refreshBadges())
    }
    navigate(pathFor(n))
  }

  const markAll = async () => {
    setData((prev) => (prev ?? []).map((x) => ({ ...x, read: true })))
    patchBadges({ unread_notification_count: 0 })
    try {
      await notificationApi.markAllRead()
    } catch {
      // 실패하면 서버 상태로 되돌린다
      refetch()
      refreshBadges()
    }
  }

  return (
    <Page>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-[#0F172A]">알림</h1>
        {items.some((n) => !n.read) && (
          <button onClick={() => void markAll()} className="text-[13px] text-[#0EA5E9] font-medium hover:underline">
            모두 읽음 처리
          </button>
        )}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 18 18" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 1.5a5.5 5.5 0 0 0-5.5 5.5v3l-1.5 2h14l-1.5-2V7A5.5 5.5 0 0 0 9 1.5z" />
              <path d="M7.5 14.5a1.5 1.5 0 0 0 3 0" />
            </svg>
          }
          title="아직 알림이 없어요"
          description="커피챗 신청이나 새로운 추천이 생기면 여기에 표시돼요."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const style = NOTIF_ICON_STYLE[n.type] ?? { bg: '#F0F5FC', color: '#64748B' }
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`rounded-2xl border px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-all text-left w-full ${
                  n.read
                    ? 'bg-white border-[#E2EAF4] hover:border-[#BAE6FD]'
                    : 'bg-[#F0F9FF] border-[#BAE6FD] hover:border-[#38BDF8]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[17px] flex-shrink-0"
                  style={{ background: style.bg }}
                >
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] text-[#0F172A] ${n.read ? 'font-medium' : 'font-semibold'}`}>
                    {n.text}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">{n.time}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-[#0EA5E9] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </Page>
  )
}
