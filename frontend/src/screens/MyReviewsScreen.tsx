import { reviewApi } from '@/api'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { BackButton } from '@/components/ui'
import { useQuery } from '@/hooks/useQuery'
import { routes, useNavigate } from '@/lib/router'

export function MyReviewsScreen() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery('reviews:received', () => reviewApi.received())

  const items = data ?? []
  const average =
    items.length > 0 ? (items.reduce((sum, r) => sum + r.rating, 0) / items.length).toFixed(1) : null

  return (
    <Page>
      <BackButton label="마이페이지로" onClick={() => navigate(routes.mypage)} />
      <h1 className="text-[22px] font-bold text-[#0F172A] mb-1">받은 리뷰</h1>
      <p className="text-[13px] text-[#64748B] mb-6">
        {average ? `⭐ 평균 ${average}점 · ${items.length}개` : '팀원들이 남긴 리뷰가 여기 모여요'}
      </p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="아직 받은 리뷰가 없어요"
          description="같이 활동한 팀원이 리뷰를 남기면 여기서 볼 수 있어요."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-semibold text-[14px] text-[#0F172A]">
                  {r.reviewer_name}
                  <span className="text-[#94A3B8] font-normal ml-2">· {r.hackathon.title}</span>
                </p>
                <span className="text-[13px] font-bold text-[#F59E0B] flex-shrink-0">
                  {'⭐'.repeat(r.rating)}
                </span>
              </div>
              {r.content && (
                <p className="text-[13px] text-[#64748B] leading-relaxed">{r.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}
