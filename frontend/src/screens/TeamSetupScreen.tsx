import { useState } from 'react'
import { hackathonApi, recommendationApi, teamApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { EMPTY_TEAM, TeamFormFields } from '@/components/TeamFormFields'
import { BackButton, InlineError, PrimaryButton } from '@/components/ui'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { routes, useNavigate } from '@/lib/router'
import type { TeamInput } from '@/types'

/** 팀 모집 조건 신규 작성 → 저장 후 AI 추천 결과로 이동. */
export function TeamSetupScreen({ hackathonId }: { hackathonId: number }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<TeamInput>(EMPTY_TEAM)

  const { data, loading, error, refetch } = useQuery(`hackathon:${hackathonId}`, () =>
    hackathonApi.detail(hackathonId),
  )

  const save = useMutation(
    async (input: TeamInput) => {
      const team = await teamApi.create(hackathonId, input)
      try {
        await recommendationApi.generate(hackathonId)
      } catch {
        /* 추천 생성 실패는 결과 화면에서 재시도 */
      }
      return team
    },
    { onSuccess: () => navigate(routes.recommendations(hackathonId)) },
  )

  const neededTotal = Object.values(form.needed_roles).reduce((sum, n) => sum + n, 0)

  if (loading) {
    return (
      <Page>
        <LoadingState />
      </Page>
    )
  }
  if (error) {
    return (
      <Page>
        <ErrorState error={error} onRetry={refetch} />
      </Page>
    )
  }

  return (
    <Page>
      <BackButton label="뒤로" onClick={() => navigate(routes.join(hackathonId))} />
      <h1 className="text-[20px] font-bold text-gray-800">팀 모집 조건 작성</h1>
      <p className="text-[13px] text-[#8FA3BF] mt-1 mb-8">{data?.title}</p>

      <TeamFormFields value={form} onChange={setForm} />

      <InlineError message={save.error?.message} />
      {neededTotal === 0 && (
        <p className="text-[12px] text-[#94A3B8] mb-2">필요한 역할을 최소 1명 이상 지정해주세요.</p>
      )}

      <PrimaryButton
        onClick={() => save.mutate(form)}
        loading={save.loading}
        disabled={neededTotal === 0}
        className="w-full mt-4"
      >
        저장하고 추천받기
      </PrimaryButton>
    </Page>
  )
}
