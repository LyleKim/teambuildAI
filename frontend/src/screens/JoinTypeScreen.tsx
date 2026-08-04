import { hackathonApi, participationApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { BackButton, InlineError } from '@/components/ui'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { routes, useNavigate } from '@/lib/router'
import type { JoinType } from '@/types'

const CHOICES: { type: JoinType; label: string; sub: string }[] = [
  { type: 'individual', label: '개인으로 참가', sub: '팀을 찾고 있어요' },
  { type: 'team', label: '팀 모집자로 참가', sub: '팀원을 구하고 있어요' },
]

/**
 * 참가 방식 선택.
 *
 * 선택 즉시 참가 레코드를 서버에 만들고, 이후 프로필/모집조건 화면으로 넘어간다.
 * (조건 작성 도중 이탈해도 "참가 신청함" 상태는 남는다)
 */
export function JoinTypeScreen({ hackathonId }: { hackathonId: number }) {
  const navigate = useNavigate()

  const { data, loading, error, refetch } = useQuery(`hackathon:${hackathonId}`, () =>
    hackathonApi.detail(hackathonId),
  )

  const join = useMutation(
    (joinType: JoinType) => participationApi.join(hackathonId, joinType),
    {
      onSuccess: (_participation, joinType) => {
        navigate(
          joinType === 'individual'
            ? routes.profileSetup(hackathonId)
            : routes.teamSetup(hackathonId),
        )
      },
    },
  )

  return (
    <Page>
      <BackButton label="뒤로" onClick={() => navigate(routes.hackathon(hackathonId))} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="text-center mb-10">
            <h1 className="text-[26px] font-bold text-gray-800">어떻게 참가하시겠어요?</h1>
            <p className="text-[14px] text-[#8FA3BF] mt-2">{data.title}</p>
          </div>

          <InlineError message={join.error?.message} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CHOICES.map(({ type, label, sub }) => (
              <button
                key={type}
                onClick={() => join.mutate(type)}
                disabled={join.loading}
                className="bg-white rounded-2xl border-2 border-[#E2EAF4] p-8 text-left hover:border-[#4EAAF5] hover:shadow-md transition-all duration-200 group disabled:opacity-60 disabled:cursor-wait"
              >
                <div className="w-12 h-12 rounded-xl mb-5 bg-[#E2EAF4] group-hover:bg-[#4EAAF5] transition-colors" />
                <h3 className="font-bold text-[16px] text-gray-800">{label}</h3>
                <p className="text-[13px] text-[#8FA3BF] mt-1">{sub}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </Page>
  )
}
