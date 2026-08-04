import { useEffect, useState } from 'react'
import { teamApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { EMPTY_TEAM, TeamFormFields } from '@/components/TeamFormFields'
import { BackButton, InlineError, useToast } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { RECRUIT_STATUS_STYLES } from '@/lib/constants'
import { routes, useNavigate } from '@/lib/router'
import type { TeamInput } from '@/types'

export function TeamEditScreen({ teamId }: { teamId: number }) {
  const navigate = useNavigate()
  const { options } = useMetaOptions()
  const { toast, show } = useToast()

  const { data, loading, error, refetch } = useQuery(`team:${teamId}`, () => teamApi.detail(teamId))
  const [form, setForm] = useState<TeamInput>(EMPTY_TEAM)

  useEffect(() => {
    if (data) setForm({ ...EMPTY_TEAM, ...data })
  }, [data])

  const save = useMutation((input: TeamInput) => teamApi.update(teamId, input), {
    onSuccess: () => {
      show('모집 조건을 저장했어요')
      window.setTimeout(() => navigate(routes.myStatus), 600)
    },
  })

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
      {toast}
      <BackButton label="내 참가 현황으로" onClick={() => navigate(routes.myStatus)} />
      <h1 className="text-[20px] font-bold text-[#0F172A]">팀 모집 조건 수정</h1>
      <p className="text-[13px] text-[#64748B] mt-0.5 mb-6">{data?.hackathon.title}</p>

      {/* 모집 상태 */}
      <div className="bg-white rounded-2xl border border-[#E2EAF4] px-5 py-4 mb-8 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#0F172A] mb-0.5">모집 상태</p>
          <p className="text-[12px] text-[#64748B]">현재 팀원 모집 진행 상황을 선택해주세요</p>
        </div>
        <div className="relative">
          <select
            value={form.recruit_status}
            onChange={(e) => setForm((prev) => ({ ...prev, recruit_status: e.target.value }))}
            className={`appearance-none text-[13px] font-semibold px-4 py-2 pr-8 rounded-xl border cursor-pointer outline-none ${
              RECRUIT_STATUS_STYLES[form.recruit_status] ?? ''
            }`}
          >
            {options.recruit_statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <TeamFormFields value={form} onChange={setForm} showOpenChat />

      <InlineError message={save.error?.message} />

      <div className="flex gap-3">
        <button
          onClick={() => navigate(routes.myStatus)}
          disabled={save.loading}
          className="flex-1 border border-[#E2EAF4] bg-white rounded-xl py-3.5 text-[14px] font-semibold text-[#64748B] hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={() => save.mutate(form)}
          disabled={save.loading}
          className="flex-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl py-3.5 text-[14px] font-semibold transition-colors shadow-sm disabled:bg-[#BAE6FD] flex items-center justify-center gap-2"
        >
          {save.loading && (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          수정 저장
        </button>
      </div>
    </Page>
  )
}
