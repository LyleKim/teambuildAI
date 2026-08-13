import { useEffect, useState } from 'react'
import { coffeechatApi } from '@/api'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Avatar, InlineError, StatusBadge } from '@/components/ui'
import { useSession } from '@/context/SessionContext'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { BADGE_POLL_INTERVAL, COFFEECHAT_FILTERS } from '@/lib/constants'
import { initialOf } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'
import type { CoffeeChat, CoffeeChatStatus } from '@/types'

type Tab = 'received' | 'sent'

export function CoffeeChatInboxScreen() {
  const navigate = useNavigate()
  const { refreshBadges } = useSession()

  const [tab, setTab] = useState<Tab>('received')
  const [filter, setFilter] = useState<CoffeeChatStatus | 'all'>('all')

  const { data, loading, error, refetch, setData } = useQuery<CoffeeChat[]>(
    `coffeechats:${tab}:${filter}`,
    () => (tab === 'received' ? coffeechatApi.received(filter) : coffeechatApi.sent(filter)),
  )

  // 새로 들어온 신청을 페이지 이동 없이도 보이게 주기적으로 갱신한다 (WebSocket 도입 전 임시 수단)
  useEffect(() => {
    const timer = window.setInterval(refetch, BADGE_POLL_INTERVAL)
    return () => window.clearInterval(timer)
  }, [refetch])

  /** 목록에서 해당 항목의 상태만 즉시 바꿔 재요청 없이 UI를 갱신한다. */
  const patchItem = (id: number, patch: Partial<CoffeeChat>) =>
    setData((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const accept = useMutation((id: number) => coffeechatApi.accept(id), {
    onSuccess: (updated) => {
      patchItem(updated.id, updated)
      refreshBadges()
      // 수락하면 채팅방이 생기므로 성사 화면으로 안내한다
      navigate(routes.coffeechatMatched(updated.id))
    },
  })

  const reject = useMutation((id: number) => coffeechatApi.reject(id), {
    onSuccess: (updated) => {
      patchItem(updated.id, updated)
      refreshBadges()
    },
  })

  const progress = useMutation(
    ({ id, status }: { id: number; status: 'in_progress' | 'completed' }) =>
      coffeechatApi.setProgress(id, status),
    { onSuccess: (updated) => patchItem(updated.id, updated) },
  )

  const remove = useMutation((id: number) => coffeechatApi.remove(id), {
    onSuccess: (_void, id) => setData((prev) => (prev ?? []).filter((c) => c.id !== id)),
  })

  const deleteItem = (id: number) => {
    if (window.confirm('이 커피챗 기록을 삭제할까요? 되돌릴 수 없어요.')) {
      remove.mutate(id)
    }
  }

  // 수락 이후(진행중/완료 포함)는 "내 현황 > 팀원"으로 옮겨갔으니 받은 신청 목록엔 남기지 않는다
  const items =
    tab === 'received'
      ? (data ?? []).filter((c) => c.status === 'pending' || c.status === 'rejected')
      : (data ?? [])
  const filterOptions =
    tab === 'received'
      ? COFFEECHAT_FILTERS.filter((f) => f.value === 'all' || f.value === 'pending' || f.value === 'rejected')
      : COFFEECHAT_FILTERS
  const busy = accept.loading || reject.loading || progress.loading || remove.loading

  const switchTab = (next: Tab) => {
    setTab(next)
    setFilter('all')
  }

  return (
    <Page>
      <h1 className="text-[22px] font-bold text-[#0F172A] mb-5">커피챗 관리함</h1>

      <div className="flex gap-1.5 mb-4">
        {(['received', 'sent'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              tab === t
                ? 'bg-[#0EA5E9] text-white'
                : 'bg-white text-[#64748B] border border-[#E2EAF4] hover:border-[#38BDF8]'
            }`}
          >
            {t === 'received' ? '받은 신청' : '보낸 신청'}
          </button>
        ))}
      </div>

      {tab === 'received' && (
        <p className="text-[12px] text-[#94A3B8] mb-3">
          수락한 커피챗은 <span className="font-medium text-[#0EA5E9]">내 현황</span>에서 팀원으로 확인할 수 있어요.
        </p>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
              filter === f.value
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-white text-[#64748B] border-[#E2EAF4] hover:border-[#0EA5E9] hover:text-[#0EA5E9]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <InlineError
        message={
          accept.error?.message ?? reject.error?.message ?? progress.error?.message ?? remove.error?.message
        }
      />

      {loading && !data && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && items.length === 0 && (
        <EmptyState
          title={filter === 'all' ? '아직 주고받은 커피챗이 없어요' : '해당 상태의 신청이 없어요'}
          description={
            filter === 'all'
              ? 'AI 추천을 통해 팀원에게 먼저 커피챗을 신청해보세요!'
              : '다른 필터를 선택해보세요.'
          }
        />
      )}

      {!error && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const person = item.counterpart
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
                <div className="flex items-start gap-3 mb-3">
                  <button onClick={() => navigate(routes.member(person.id))}>
                    <Avatar initial={person.initial || initialOf(person.name)} size={40} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-[14px] text-[#0F172A] truncate">
                        {person.name} <span className="text-[#64748B] font-normal">· {person.role}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={item.status} />
                        <button
                          onClick={() => deleteItem(item.id)}
                          disabled={busy}
                          aria-label="삭제"
                          className="text-[#94A3B8] hover:text-[#F43F5E] transition-colors disabled:opacity-40"
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h11M5.5 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M6 7v4M9 7v4M3.5 4l.6 8a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mb-1">{item.hackathon.title}</p>
                    <p className="text-[13px] text-[#64748B] leading-relaxed">{item.message}</p>
                    {item.sender_contact && (
                      <a
                        href={item.sender_contact}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1.5 text-[12px] font-medium text-[#0EA5E9] hover:underline"
                      >
                        💬 오픈채팅 링크 열기
                      </a>
                    )}
                  </div>
                </div>

                {/* 받은 신청 중 대기 상태만 수락/거절할 수 있다 */}
                {tab === 'received' && item.status === 'pending' && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => accept.mutate(item.id)}
                      disabled={busy}
                      className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => reject.mutate(item.id)}
                      disabled={busy}
                      className="flex-1 bg-white border border-[#FECDD3] text-[#F43F5E] hover:bg-[#FFF1F2] rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                    >
                      거절
                    </button>
                  </div>
                )}

                {(item.status === 'accepted' || item.status === 'in_progress' || item.status === 'completed') && (
                  <div className="flex gap-2 mt-1">
                    {item.thread_id && (
                      <button
                        onClick={() => navigate(routes.thread(item.thread_id!))}
                        className="flex-1 border border-[#E2EAF4] rounded-xl py-2.5 text-[13px] font-semibold text-[#0EA5E9] hover:bg-[#F0F9FF] transition-colors"
                      >
                        대화 열기
                      </button>
                    )}
                    {item.status === 'accepted' && (
                      <button
                        onClick={() => progress.mutate({ id: item.id, status: 'in_progress' })}
                        disabled={busy}
                        className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                      >
                        진행중으로 표시
                      </button>
                    )}
                    {item.status === 'in_progress' && (
                      <button
                        onClick={() => progress.mutate({ id: item.id, status: 'completed' })}
                        disabled={busy}
                        className="flex-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
                      >
                        완료로 표시
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
