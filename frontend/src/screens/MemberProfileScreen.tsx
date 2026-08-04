import { useState } from 'react'
import { profileApi } from '@/api'
import { CoffeeChatModal } from '@/components/CoffeeChatModal'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { Avatar, BackButton, StatusBadge, useToast } from '@/components/ui'
import { LINK_META } from '@/lib/constants'
import { initialOf } from '@/lib/format'
import { lastHackathonId } from '@/lib/prefs'
import { useQuery } from '@/hooks/useQuery'
import { useLocation } from '@/lib/router'
import type { LinkType } from '@/types'

export function MemberProfileScreen({ userId }: { userId: number }) {
  const { query } = useLocation()
  const { toast, show } = useToast()
  const [modalOpen, setModalOpen] = useState(false)

  // 커피챗은 해커톤 단위라 컨텍스트가 필요하다.
  // 링크에 hackathon 파라미터가 있으면 그걸, 없으면 마지막으로 본 해커톤을 쓴다.
  const hackathonId = Number(query.get('hackathon')) || lastHackathonId()

  const { data, loading, error, refetch, setData } = useQuery(`profile:${userId}`, () =>
    profileApi.member(userId),
  )

  const bioItems = data
    ? [
        { label: '저는 이런 사람이에요', value: data.bio_style },
        { label: '이런 걸 잘해요', value: data.bio_strength },
        { label: '이런 경험이 있어요', value: data.bio_experience },
        { label: '이번 해커톤에서 이걸 하고 싶어요', value: data.bio_goal },
        { label: '팀에 이렇게 기여할 수 있어요', value: data.bio_contribution },
      ].filter((q) => q.value)
    : []

  const infoItems = data
    ? ([
        ['활동 가능 시간', data.available_time],
        ['참여 목표', data.goal],
        ['협업 방식', data.collaboration],
        ['소통 방식', data.communication],
      ] as [string, string][])
    : []

  return (
    <Page>
      {toast}
      <BackButton label="뒤로" onClick={() => window.history.back()} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Avatar initial={data.initial || initialOf(data.name)} size={64} className="bg-[#4EAAF5]" />
            <div>
              <h1 className="text-[22px] font-bold text-gray-800">{data.name}</h1>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {data.roles.map((r) => (
                  <span key={r} className="bg-blue-100 text-[#4EAAF5] text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {data.one_liner && (
            <p className="text-[14px] text-[#64748B] mb-5 leading-relaxed">{data.one_liner}</p>
          )}

          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {data.skills.map((s) => (
                <span key={s} className="bg-white border border-[#E2EAF4] text-gray-600 text-[13px] px-3 py-1 rounded-lg">
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {infoItems.map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl border border-[#E2EAF4] p-4">
                <p className="text-[11px] text-[#8FA3BF] mb-1">{label}</p>
                <p className="text-[14px] font-semibold text-gray-800">{value || '—'}</p>
              </div>
            ))}
          </div>

          {data.interests.length > 0 && (
            <div className="mb-5">
              <p className="text-[13px] font-semibold text-gray-700 mb-2">관심 분야</p>
              <div className="flex gap-2 flex-wrap">
                {data.interests.map((i) => (
                  <span key={i} className="bg-blue-100 text-[#4EAAF5] text-[12px] font-semibold px-3 py-1 rounded-full">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-[13px] font-semibold text-[#0F172A] mb-3">자기소개</p>
            <div className="bg-white rounded-2xl border border-[#E2EAF4] overflow-hidden">
              {bioItems.length > 0 ? (
                bioItems.map((q, idx) => (
                  <div
                    key={q.label}
                    className={`px-5 py-4 ${idx < bioItems.length - 1 ? 'border-b border-[#F8FAFC]' : ''}`}
                  >
                    <p className="text-[11px] font-semibold text-[#0EA5E9] mb-1 uppercase tracking-wide">
                      {q.label}
                    </p>
                    <p className="text-[14px] text-[#0F172A] leading-relaxed">{q.value}</p>
                  </div>
                ))
              ) : (
                <div className="px-5 py-4">
                  <p className="text-[14px] text-[#94A3B8] leading-relaxed">
                    아직 작성된 자기소개가 없어요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {data.links.length > 0 && (
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-[#0F172A] mb-2.5">포트폴리오</p>
              <div className="flex flex-wrap gap-2">
                {data.links.map((link, i) => {
                  const meta = LINK_META[link.type as LinkType] ?? LINK_META['기타']
                  return (
                    <a
                      key={`${link.type}-${i}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1.5 border rounded-full px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-75 ${meta.color} ${meta.bg} ${meta.border}`}
                    >
                      <span className="text-[14px]">{meta.icon}</span>
                      {link.type}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-50">
                        <path d="M2 8L8 2M4 2h4v4" />
                      </svg>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* 연락처 — 서버가 커피챗 수락 전에는 null로 내려준다 */}
          <div className="rounded-xl border px-5 py-3.5 mb-4 flex items-center gap-3 bg-white border-[#E2EAF4]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke={data.open_chat ? '#22C55E' : '#94A3B8'}
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            {data.open_chat ? (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#22C55E]">오픈채팅/연락처</p>
                <a href={data.open_chat} target="_blank" rel="noreferrer" className="text-[13px] text-[#0EA5E9] underline break-all">
                  {data.open_chat}
                </a>
              </div>
            ) : (
              <div>
                <p className="text-[12px] font-semibold text-[#94A3B8]">오픈채팅/연락처</p>
                <p className="text-[12px] text-[#94A3B8]">커피챗 수락 후 공개</p>
              </div>
            )}
          </div>

          {data.coffeechat_sent ? (
            <div className="w-full bg-[#F1F5F9] border border-[#E2EAF4] rounded-xl py-3.5 flex items-center justify-center gap-2">
              <span className="text-[14px] font-semibold text-[#94A3B8]">커피챗 신청함</span>
              {data.coffeechat_status && <StatusBadge status={data.coffeechat_status} />}
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              disabled={!hackathonId}
              title={hackathonId ? undefined : '해커톤을 먼저 선택해주세요'}
              className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[15px] rounded-xl py-3.5 transition-colors shadow-sm disabled:bg-[#BAE6FD] disabled:cursor-not-allowed"
            >
              커피챗 신청하기
            </button>
          )}

          {modalOpen && hackathonId && (
            <CoffeeChatModal
              target={{
                userId: data.id,
                name: data.name,
                initial: data.initial || initialOf(data.name),
                role: data.roles[0] ?? '팀원',
              }}
              hackathonId={hackathonId}
              onClose={() => setModalOpen(false)}
              onSent={() => {
                setData((prev) => (prev ? { ...prev, coffeechat_sent: true, coffeechat_status: 'pending' } : prev))
                setModalOpen(false)
                show('커피챗 신청을 보냈어요')
              }}
            />
          )}
        </>
      )}
    </Page>
  )
}
