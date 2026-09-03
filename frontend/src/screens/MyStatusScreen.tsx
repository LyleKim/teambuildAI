import { participationApi } from '@/api'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { InlineError } from '@/components/ui'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { RECRUIT_STATUS_STYLES } from '@/lib/constants'
import { routes, useNavigate } from '@/lib/router'

export function MyStatusScreen() {
  const navigate = useNavigate()
  const { data, loading, error, refetch, setData } = useQuery('me:participations', () =>
    participationApi.mine(),
  )

  const leave = useMutation((id: number) => participationApi.leave(id), {
    onSuccess: (_void, id) => setData((prev) => (prev ?? []).filter((p) => p.id !== id)),
  })

  const deleteItem = (id: number, title: string) => {
    if (window.confirm(`'${title}' 참가를 삭제할까요? 되돌릴 수 없어요.`)) {
      leave.mutate(id)
    }
  }

  const items = data ?? []

  return (
    <Page>
      <h1 className="text-[22px] font-bold text-[#0F172A] mb-6">내 참가 현황</h1>

      <InlineError message={leave.error?.message} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="아직 참가 중인 해커톤이 없어요"
          description="관심 있는 해커톤을 찾아 참가해보세요."
          action={
            <button
              onClick={() => navigate(routes.hackathons)}
              className="mt-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[14px] px-8 py-3 rounded-xl transition-colors"
            >
              해커톤 둘러보기
            </button>
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <button
                    onClick={() => navigate(routes.teamSpace(p.hackathon.id))}
                    className="font-bold text-[15px] text-[#0F172A] hover:text-[#0EA5E9] transition-colors text-left"
                  >
                    {p.hackathon.title}
                  </button>
                  <p className="text-[13px] text-[#64748B] mt-0.5">
                    {p.join_type === 'individual' ? '참가자(개인)' : '팀 모집자'}
                  </p>
                </div>
                {p.ended_at ? (
                  <span className="text-[12px] font-semibold px-3 py-1 rounded-full flex-shrink-0 text-[#64748B] bg-[#F1F5F9] border border-[#E2EAF4]">
                    ✅ 종료됨
                  </span>
                ) : (
                  <span
                    className={`text-[12px] font-semibold px-3 py-1 rounded-full flex-shrink-0 ${
                      RECRUIT_STATUS_STYLES[p.status] ?? RECRUIT_STATUS_STYLES['모집 마감']
                    }`}
                  >
                    {p.status}
                  </span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => navigate(routes.recommendations(p.hackathon.id))}
                  className="border border-[#E2EAF4] rounded-xl px-4 py-2 text-[13px] font-medium text-[#0EA5E9] hover:bg-[#F0F9FF] transition-colors"
                >
                  AI 추천 보기
                </button>
                {p.join_type === 'team' && p.team_id && (
                  <button
                    onClick={() => navigate(routes.teamEdit(p.team_id!))}
                    className="border border-[#E2EAF4] rounded-xl px-4 py-2 text-[13px] font-medium text-[#0EA5E9] hover:bg-[#F0F9FF] transition-colors"
                  >
                    모집 조건 수정
                  </button>
                )}
                <button
                  onClick={() => deleteItem(p.id, p.hackathon.title)}
                  disabled={leave.loading}
                  className="border border-[#FECDD3] rounded-xl px-4 py-2 text-[13px] font-medium text-[#E11D48] hover:bg-[#FFF1F2] transition-colors disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
