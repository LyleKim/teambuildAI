import { profileApi } from '@/api'
import { Page } from '@/components/NavBar'
import { LoadingState } from '@/components/states'
import { Avatar, InlineError, Toggle, useToast } from '@/components/ui'
import { useSession } from '@/context/SessionContext'
import { useMutation } from '@/hooks/useMutation'
import { initialOf } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'

export function MyPageScreen() {
  const navigate = useNavigate()
  const { user, ready, signOut, refreshUser } = useSession()
  const { toast, show } = useToast()

  const setPrivate = useMutation((next: boolean) => profileApi.setPrivate(next), {
    onSuccess: (_res, next) => {
      refreshUser()
      show(next ? '추천 목록에서 숨겼어요' : '추천 목록에 다시 노출돼요')
    },
  })

  if (!ready) {
    return (
      <Page>
        <LoadingState />
      </Page>
    )
  }

  if (!user) {
    return (
      <Page>
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <p className="text-[16px] font-bold text-[#0F172A]">로그인이 필요해요</p>
          <button
            onClick={() => navigate(routes.login)}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[14px] px-8 py-3 rounded-xl transition-colors"
          >
            로그인하기
          </button>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      {toast}
      <h1 className="text-[22px] font-bold text-[#0F172A] mb-6">마이페이지</h1>

      <div className="bg-white rounded-2xl border border-[#E2EAF4] p-6 mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Avatar initial={user.initial || initialOf(user.name)} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[18px] text-[#0F172A]">{user.name}</p>
              {user.is_private && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#E2EAF4] px-2.5 py-0.5 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="2" y="5" width="8" height="6" rx="1.5" />
                    <path d="M4 5V3.5a2 2 0 0 1 4 0V5" />
                  </svg>
                  현재 추천 목록에 노출되지 않음
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#64748B] mt-0.5 truncate">{user.email}</p>
          </div>
        </div>

        {user.summary && <p className="text-[13px] text-[#64748B] mb-4">{user.summary}</p>}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(routes.profile)}
            className="border border-[#E2EAF4] rounded-xl px-4 py-2 text-[13px] font-medium text-[#0EA5E9] hover:bg-[#F0F9FF] transition-colors"
          >
            프로필 수정
          </button>
          <button
            onClick={() => navigate(routes.myReviews)}
            className="border border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] rounded-xl px-4 py-2 text-[13px] font-medium hover:bg-[#FEF3C7] transition-colors"
          >
            ⭐ 리뷰 보기
          </button>
        </div>
      </div>

      <InlineError message={setPrivate.error?.message} />

      <div className="bg-white rounded-2xl border border-[#E2EAF4] px-5 py-4 flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold text-[#0F172A]">추천 대상에서 비공개</p>
          <p className="text-[12px] text-[#64748B] mt-0.5">모든 해커톤에서 추천 대상에서 제외돼요</p>
        </div>
        <Toggle
          value={user.is_private}
          onChange={(v) => setPrivate.mutate(v)}
          disabled={setPrivate.loading}
        />
      </div>

      <button
        onClick={() => void signOut()}
        className="w-full bg-white rounded-2xl border border-[#E2EAF4] py-4 text-[14px] font-semibold text-[#F43F5E] hover:bg-[#FFF1F2] transition-colors"
      >
        로그아웃
      </button>
    </Page>
  )
}
