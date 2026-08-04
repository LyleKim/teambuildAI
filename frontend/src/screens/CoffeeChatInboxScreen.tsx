import { useState } from 'react'
import { coffeechatApi } from '@/api'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Avatar, InlineError, StatusBadge } from '@/components/ui'
import { useSession } from '@/context/SessionContext'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { COFFEECHAT_FILTERS } from '@/lib/constants'
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

  const items = data ?? []
  const busy = accept.loading || reject.loading

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

      <div className="flex gap-2 mb-5 flex-wrap">
        {COFFEECHAT_FILTERS.map((f) => (
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

      <InlineError message={accept.error?.message ?? reject.error?.message} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title={filter === 'all' ? '아직 주고받은 커피챗이 없어요' : '해당 상태의 신청이 없어요'}
          description={
            filter === 'all'
              ? 'AI 추천을 통해 팀원에게 먼저 커피챗을 신청해보세요!'
              : '다른 필터를 선택해보세요.'
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
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
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mb-1">{item.hackathon.title}</p>
                    <p className="text-[13px] text-[#64748B] leading-relaxed">{item.message}</p>
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

                {item.status === 'accepted' && item.thread_id && (
                  <button
                    onClick={() => navigate(routes.thread(item.thread_id!))}
                    className="w-full mt-1 border border-[#E2EAF4] rounded-xl py-2.5 text-[13px] font-semibold text-[#0EA5E9] hover:bg-[#F0F9FF] transition-colors"
                  >
                    대화 열기
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
