import { useEffect } from 'react'
import { chatApi } from '@/api'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Avatar } from '@/components/ui'
import { useQuery } from '@/hooks/useQuery'
import { CHAT_POLL_INTERVAL } from '@/lib/constants'
import { initialOf } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'

export function MessagesScreen() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery('chat:threads', () => chatApi.threads())

  // WebSocket 도입 전까지는 폴링으로 새 메시지를 반영한다
  useEffect(() => {
    const timer = window.setInterval(refetch, CHAT_POLL_INTERVAL)
    return () => window.clearInterval(timer)
  }, [refetch])

  const threads = data ?? []

  return (
    <Page>
      <h1 className="text-[20px] font-bold text-[#0F172A] mb-1">메시지</h1>
      <p className="text-[13px] text-[#64748B] mb-6">수락된 커피챗 상대와의 대화</p>

      {loading && !data && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!error && !loading && threads.length === 0 && (
        <EmptyState
          title="아직 대화가 없어요"
          description="커피챗이 수락되면 여기서 바로 대화할 수 있어요."
        />
      )}

      {threads.length > 0 && (
        <div className="flex flex-col gap-2">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(routes.thread(t.id))}
              className="bg-white rounded-2xl border border-[#E2EAF4] p-4 flex items-center gap-4 hover:border-[#BAE6FD] hover:bg-[#F0F9FF] transition-colors text-left w-full"
            >
              <div className="relative flex-shrink-0">
                <Avatar initial={t.initial || initialOf(t.name)} size={48} />
                {t.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#F43F5E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {t.unread > 9 ? '9+' : t.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-bold text-[14px] text-[#0F172A]">{t.name}</span>
                  <span className="text-[11px] text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full font-medium">
                    {t.role}
                  </span>
                  <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                    {t.hackathon}
                  </span>
                </div>
                <p className={`text-[13px] truncate ${t.unread > 0 ? 'font-semibold text-[#0F172A]' : 'text-[#64748B]'}`}>
                  {t.last_message}
                </p>
              </div>
              <span className="text-[11px] text-[#94A3B8] flex-shrink-0">{t.last_time}</span>
            </button>
          ))}
        </div>
      )}
    </Page>
  )
}
