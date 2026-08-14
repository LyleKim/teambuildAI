import { useEffect, useState } from 'react'
import { hackathonApi, recommendationApi } from '@/api'
import { CoffeeChatModal } from '@/components/CoffeeChatModal'
import type { CoffeeChatTarget } from '@/components/CoffeeChatModal'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, RecommendationSkeleton } from '@/components/states'
import { Avatar, InlineError, ScoreRing, useToast } from '@/components/ui'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { VERIFIED_REVIEW_COUNT } from '@/lib/constants'
import { initialOf } from '@/lib/format'
import { rememberHackathon } from '@/lib/prefs'
import { routes, useNavigate } from '@/lib/router'
import type { Recommendation } from '@/types'

/** 상위 몇 명까지 AI 카드로 보여줄지. 백엔드도 이 인원수만큼만 Groq를 호출한다. */
const AI_CARD_COUNT = 5

/**
 * AI 추천 결과.
 *
 * 추천 생성은 서버에서 비동기로 돌 수 있어 job이 끝날 때까지 폴링한다.
 * 폴링 중에는 스켈레톤을 유지해 "빈 결과"와 구분되게 한다.
 *
 * 점수/순위는 항상 알고리즘(백엔드 scoring.py)이 매기고, AI는 상위 AI_CARD_COUNT명의
 * '추천 이유' 문구만 담당한다(rec.ai_generated). AI 호출이 실패한 항목은 상위권에
 * 있어도 간단 카드(한 줄 소개 + 정량 스펙 몇 개)로 대체돼 화면이 빈 채로 남지 않는다.
 */
export function AIResultsScreen({ hackathonId }: { hackathonId: number }) {
  const navigate = useNavigate()
  const { toast, show } = useToast()
  const [target, setTarget] = useState<CoffeeChatTarget | null>(null)

  useEffect(() => {
    rememberHackathon(hackathonId)
  }, [hackathonId])

  const hackathon = useQuery(`hackathon:${hackathonId}`, () => hackathonApi.detail(hackathonId))
  const recs = useQuery(`recs:${hackathonId}`, () => recommendationApi.list(hackathonId))

  const [jobId, setJobId] = useState<string | null>(null)

  const regenerate = useMutation(() => recommendationApi.generate(hackathonId), {
    onSuccess: (job) => {
      if (job.status === 'done') {
        recs.refetch()
      } else {
        setJobId(job.job_id)
      }
    },
  })

  // 추천 생성 작업이 끝날 때까지 상태를 확인한다
  useEffect(() => {
    if (!jobId) return

    let stop = false
    const timer = window.setInterval(async () => {
      if (stop) return
      try {
        const job = await recommendationApi.jobStatus(jobId)
        if (job.status === 'done' || job.status === 'failed') {
          setJobId(null)
          if (job.status === 'done') recs.refetch()
          else show('추천 생성에 실패했어요. 다시 시도해주세요.')
        }
      } catch {
        // 상태 조회 실패 시 폴링을 멈춰 무한 요청을 막는다
        setJobId(null)
      }
    }, 2000)

    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [jobId, recs, show])

  const items = recs.data ?? []
  // 서버가 이미 -score 순으로 내려주므로 앞 N개가 곧 상위권이다.
  const topPicks = items.slice(0, AI_CARD_COUNT)
  const morePicks = items.slice(AI_CARD_COUNT)
  const generating = recs.loading || jobId !== null || regenerate.loading

  const markSent = (userId: number) => {
    recs.setData((prev) =>
      (prev ?? []).map((r) => (r.person.id === userId ? { ...r, coffeechat_sent: true } : r)),
    )
    setTarget(null)
    show('커피챗 신청을 보냈어요')
  }

  const openTarget = (rec: Recommendation) => {
    setTarget({
      userId: rec.person.id,
      name: rec.person.name,
      initial: rec.person.initial || initialOf(rec.person.name),
      role: rec.person.roles[0] ?? '팀원',
    })
  }

  return (
    <Page>
      {toast}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#0F172A]">✨ AI 추천 결과</h1>
          <p className="text-[13px] text-[#64748B] mt-1">
            {hackathon.data ? `${hackathon.data.title} 기준` : ' '}
          </p>
        </div>
        <button
          onClick={() => regenerate.mutate(undefined as void)}
          disabled={generating}
          className="text-[13px] font-medium text-[#0EA5E9] hover:underline disabled:text-[#94A3B8] disabled:no-underline flex-shrink-0 mt-1"
        >
          {generating ? '분석 중…' : '다시 추천받기'}
        </button>
      </div>

      <InlineError message={regenerate.error?.message} />

      {generating && (
        <div className="flex flex-col items-center py-10 gap-5">
          <div className="w-12 h-12 rounded-full border-4 border-[#E0F2FE] border-t-[#0EA5E9] animate-spin" />
          <p className="text-[14px] font-medium text-[#64748B]">AI가 최적의 팀원을 찾고 있어요…</p>
          <RecommendationSkeleton />
        </div>
      )}

      {!generating && recs.error && <ErrorState error={recs.error} onRetry={recs.refetch} />}

      {!generating && !recs.error && items.length === 0 && (
        <EmptyState
          icon={
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="14" r="6" />
              <path d="M6 30c0-6.627 5.373-12 12-12s12 5.373 12 12" />
              <path d="M24 8l2 2 4-4" stroke="#22C55E" strokeWidth="2.5" />
            </svg>
          }
          title="아직 조건에 맞는 추천이 없어요"
          description={'프로필을 더 채울수록 AI 매칭 정확도가 올라가요.\n한 줄 소개와 소통 방식을 입력해보세요.'}
          action={
            <button
              onClick={() => navigate(routes.profileSetup(hackathonId))}
              className="mt-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[14px] px-8 py-3 rounded-xl transition-colors"
            >
              프로필 수정하기
            </button>
          }
        />
      )}

      {!generating && !recs.error && items.length > 0 && (
        <>
          <div className="flex flex-col gap-5">
            {topPicks.map((rec) =>
              rec.ai_generated ? (
                <FullRecommendationCard
                  key={rec.id}
                  rec={rec}
                  onOpenDetail={() => navigate(routes.member(rec.person.id))}
                  onRequestCoffeeChat={() => openTarget(rec)}
                />
              ) : (
                <CompactRecommendationCard
                  key={rec.id}
                  rec={rec}
                  variant="wide"
                  onOpenDetail={() => navigate(routes.member(rec.person.id))}
                  onRequestCoffeeChat={() => openTarget(rec)}
                />
              ),
            )}
          </div>

          {morePicks.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-semibold text-[#64748B] mb-3">이 외에도 이런 분들이 있어요</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {morePicks.map((rec) => (
                  <CompactRecommendationCard
                    key={rec.id}
                    rec={rec}
                    variant="scroll"
                    onOpenDetail={() => navigate(routes.member(rec.person.id))}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {target && (
        <CoffeeChatModal
          target={target}
          hackathonId={hackathonId}
          onClose={() => setTarget(null)}
          onSent={markSent}
        />
      )}
    </Page>
  )
}

/** AI가 문구를 만든 상위권 카드. 잘 맞는 점/상호 보완/체크 포인트/추천 이유를 전부 보여준다. */
function FullRecommendationCard({
  rec,
  onOpenDetail,
  onRequestCoffeeChat,
}: {
  rec: Recommendation
  onOpenDetail: () => void
  onRequestCoffeeChat: () => void
}) {
  const p = rec.person
  const avatarInitial = p.initial || initialOf(p.name)
  return (
    <div className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
      <div className="flex items-center gap-3 mb-4">
        <Avatar initial={avatarInitial} size={40} verified={p.review_summary.count >= VERIFIED_REVIEW_COUNT} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[15px] text-[#0F172A]">{p.name}</p>
            {p.review_summary.count > 0 && (
              <span className="text-[11px] font-semibold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                ⭐ {p.review_summary.average} ({p.review_summary.count})
              </span>
            )}
          </div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {p.roles.map((r) => (
              <span key={r} className="bg-[#E0F2FE] text-[#0EA5E9] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {r}
              </span>
            ))}
            {p.skills.map((s) => (
              <span key={s} className="bg-[#F8FAFC] text-[#64748B] text-[11px] px-2 py-0.5 rounded-full border border-[#E2EAF4]">
                {s}
              </span>
            ))}
          </div>
        </div>
        <ScoreRing score={rec.score} />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="bg-[#F0FDF4] rounded-xl px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-[#22C55E] mb-0.5">✅ 잘 맞는 점</p>
          <p className="text-[12px] text-[#64748B]">{rec.fit_points}</p>
        </div>
        <div className="bg-[#F0F9FF] rounded-xl px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-[#0EA5E9] mb-0.5">🔷 상호 보완</p>
          <p className="text-[12px] text-[#64748B]">{rec.complement}</p>
        </div>
        <div className="bg-[#FFF7ED] rounded-xl px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-[#F59E0B] mb-0.5">⚠ 체크 포인트</p>
          <p className="text-[12px] text-[#64748B]">{rec.check_point}</p>
        </div>
        <div className="bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 border border-[#E2EAF4]">
          <p className="text-[11px] font-semibold text-[#64748B] mb-0.5">→ 추천 이유</p>
          <p className="text-[12px] text-[#64748B]">{rec.reason}</p>
        </div>
      </div>

      <CardActions rec={rec} onOpenDetail={onOpenDetail} onRequestCoffeeChat={onRequestCoffeeChat} />
    </div>
  )
}

/**
 * AI 문구가 없는 카드 — 상위 5명 중 AI 호출이 실패한 경우와, 5위 밖 나머지 전원이
 * 여기 해당한다. 지어낸 "추천 이유"를 보여주는 대신 본인이 직접 쓴 한 줄 소개와
 * 정량 스펙 몇 개(역할/기술스택/지역)만 보여주고, 자세히 보려면 상세 프로필로 보낸다.
 *
 * variant="wide": 상위 리스트에 섞여 세로로 나열될 때 — 커피챗 신청 버튼 포함.
 * variant="scroll": 5위 밖 사람들을 가로 스크롤로 훑어볼 때 — 카드 전체 클릭으로 상세 이동.
 */
function CompactRecommendationCard({
  rec,
  variant,
  onOpenDetail,
  onRequestCoffeeChat,
}: {
  rec: Recommendation
  variant: 'wide' | 'scroll'
  onOpenDetail: () => void
  onRequestCoffeeChat?: () => void
}) {
  const p = rec.person
  const avatarInitial = p.initial || initialOf(p.name)
  const specChips = [p.roles[0], p.skills[0], p.regions[0]].filter(Boolean) as string[]

  const content = (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Avatar initial={avatarInitial} size={40} verified={p.review_summary.count >= VERIFIED_REVIEW_COUNT} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[15px] text-[#0F172A] truncate">{p.name}</p>
            {p.review_summary.count > 0 && (
              <span className="text-[11px] font-semibold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full flex-shrink-0">
                ⭐ {p.review_summary.average} ({p.review_summary.count})
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#64748B] mt-0.5 line-clamp-1">
            {p.one_liner || '아직 한 줄 소개가 없어요.'}
          </p>
        </div>
        <ScoreRing score={rec.score} />
      </div>

      <div className="flex gap-1.5 flex-wrap mb-1">
        {specChips.map((chip) => (
          <span
            key={chip}
            className="bg-[#F8FAFC] text-[#64748B] text-[11px] px-2 py-0.5 rounded-full border border-[#E2EAF4]"
          >
            {chip}
          </span>
        ))}
      </div>
    </>
  )

  if (variant === 'scroll') {
    return (
      <button
        onClick={onOpenDetail}
        className="text-left bg-white rounded-2xl border border-[#E2EAF4] p-4 w-[220px] flex-shrink-0 snap-start hover:border-[#0EA5E9] transition-colors"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
      {content}
      <div className="mt-3">
        <CardActions rec={rec} onOpenDetail={onOpenDetail} onRequestCoffeeChat={onRequestCoffeeChat!} />
      </div>
    </div>
  )
}

function CardActions({
  rec,
  onOpenDetail,
  onRequestCoffeeChat,
}: {
  rec: Recommendation
  onOpenDetail: () => void
  onRequestCoffeeChat: () => void
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onOpenDetail}
        className="flex-1 border border-[#E2EAF4] rounded-xl py-2.5 text-[13px] font-medium text-[#64748B] hover:bg-gray-50 transition-colors"
      >
        상세 프로필 보기
      </button>
      {rec.coffeechat_sent ? (
        <button
          disabled
          className="flex-1 bg-[#F1F5F9] border border-[#E2EAF4] text-[#94A3B8] rounded-xl py-2.5 text-[13px] font-semibold cursor-not-allowed"
        >
          신청함 ✓
        </button>
      ) : (
        <button
          onClick={onRequestCoffeeChat}
          className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors"
        >
          커피챗 신청하기
        </button>
      )}
    </div>
  )
}
