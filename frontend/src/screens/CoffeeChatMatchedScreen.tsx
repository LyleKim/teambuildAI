import { coffeechatApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { Avatar } from '@/components/ui'
import { useQuery } from '@/hooks/useQuery'
import { initialOf } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'

/** 커피챗 수락 직후의 성사 안내 화면. */
export function CoffeeChatMatchedScreen({ coffeechatId }: { coffeechatId: number }) {
  const navigate = useNavigate()

  const { data, loading, error, refetch } = useQuery(`coffeechat:${coffeechatId}`, () =>
    coffeechatApi.detail(coffeechatId),
  )

  return (
    <Page>
      {loading && <LoadingState />}
        {!loading && error && <ErrorState error={error} onRetry={refetch} />}

        {!loading && !error && data && (
          <div className="max-w-lg mx-auto py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#E0F2FE] flex items-center justify-center mx-auto mb-6">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 24V8a2 2 0 012-2h24a2 2 0 012 2v11a2 2 0 01-2 2H10l-5 5z" />
                <path d="M12 13h14M12 18h8" />
              </svg>
            </div>
            <h1 className="text-[26px] font-bold text-[#0F172A] mb-2">🎉 커피챗이 성사되었어요!</h1>
            <p className="text-[14px] text-[#64748B] mb-8">ㅎㅋㅌ 메시지에서 바로 대화를 시작해보세요</p>

            <div className="bg-white rounded-2xl border border-[#E2EAF4] p-6 text-left mb-6">
              <div className="flex items-center gap-3 mb-5">
                <Avatar initial={data.counterpart.initial || initialOf(data.counterpart.name)} size={48} />
                <div>
                  <p className="font-bold text-[16px] text-[#0F172A]">{data.counterpart.name}</p>
                  <p className="text-[13px] text-[#64748B]">
                    {data.counterpart.role} · {data.hackathon.title}
                  </p>
                </div>
                <span className="ml-auto text-[12px] font-semibold text-[#22C55E] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1 rounded-full">
                  수락됨
                </span>
              </div>

              <p className="text-[12px] text-[#94A3B8] mb-3 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 1a3.5 3.5 0 000 7M1 11c0-3 2-4 5-4s5 1 5 4" />
                  <path d="M9 3l1.5 1.5L13 2" stroke="#22C55E" strokeWidth="1.5" />
                </svg>
                수락 후 대화가 열렸어요
              </p>

              <button
                onClick={() => data.thread_id && navigate(routes.thread(data.thread_id))}
                disabled={!data.thread_id}
                className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[15px] rounded-xl py-3.5 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:bg-[#BAE6FD] disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V4z" />
                </svg>
                메시지 보내기
              </button>
            </div>

            <button
              onClick={() => navigate(routes.coffeechats)}
              className="text-[#4EAAF5] text-[14px] font-medium hover:underline"
            >
              ← 커피챗 관리함으로
            </button>
          </div>
        )}
    </Page>
  )
}
