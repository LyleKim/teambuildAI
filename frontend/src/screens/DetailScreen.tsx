import { useEffect } from 'react'
import { hackathonApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { BackButton, PrimaryButton } from '@/components/ui'
import { useQuery } from '@/hooks/useQuery'
import { bannerGradient, periodOf } from '@/lib/format'
import { rememberHackathon } from '@/lib/prefs'
import { routes, useNavigate } from '@/lib/router'

export function DetailScreen({ hackathonId }: { hackathonId: number }) {
  const navigate = useNavigate()

  const { data, loading, error, refetch } = useQuery(`hackathon:${hackathonId}`, () =>
    hackathonApi.detail(hackathonId),
  )

  useEffect(() => {
    rememberHackathon(hackathonId)
  }, [hackathonId])

  return (
    <Page>
      <BackButton label="목록으로" onClick={() => navigate(routes.hackathons)} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div
            className="w-full h-52 rounded-2xl flex items-center justify-center mb-6 bg-cover bg-center"
            style={
              data.banner_url
                ? { backgroundImage: `url(${data.banner_url})` }
                : { background: bannerGradient(data.color) }
            }
          >
            {!data.banner_url && <span className="text-[#8FA3BF] text-[13px]">배너 이미지</span>}
          </div>

          <span className="bg-blue-100 text-[#4EAAF5] text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {data.category}
          </span>
          <h1 className="text-[22px] font-bold text-gray-800 mt-3">{data.title}</h1>
          <p className="text-[13px] text-[#8FA3BF] mt-1">{periodOf(data)}</p>
          <p className="text-[14px] text-gray-600 mt-4 leading-relaxed whitespace-pre-line">
            {data.description}
          </p>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-xl border border-[#E2EAF4] p-4 text-center">
              <div className="text-[28px] font-bold text-[#4EAAF5]">{data.teams}</div>
              <div className="text-[12px] text-[#8FA3BF] mt-0.5">모집 중인 팀</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2EAF4] p-4 text-center">
              <div className="text-[28px] font-bold text-[#4EAAF5]">{data.participants}</div>
              <div className="text-[12px] text-[#8FA3BF] mt-0.5">참가 개인</div>
            </div>
          </div>

          <PrimaryButton
            onClick={() => navigate(routes.join(hackathonId))}
            className="w-full mt-6"
          >
            이 해커톤 참가하기
          </PrimaryButton>
        </>
      )}
    </Page>
  )
}
