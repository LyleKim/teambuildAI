import { useState } from 'react'
import { LogoIcon, useToast } from '@/components/ui'
import { useSession } from '@/context/SessionContext'
import { initialOf } from '@/lib/format'
import { lastHackathonId } from '@/lib/prefs'
import { routes, useLocation, useNavigate } from '@/lib/router'

const NAV_LABELS = ['홈', '추천', '커피챗', '내 현황', '마이페이지'] as const
type NavLabel = (typeof NAV_LABELS)[number] | '알림' | '메시지' | null

/** 현재 경로에서 활성 탭을 역산한다. 탭 상태를 따로 들고 다니지 않기 위함. */
function activeLabelFor(path: string): NavLabel {
  if (path.endsWith('/recommendations')) return '추천'
  if (path.startsWith('/hackathons')) return '홈'
  if (path.startsWith('/coffeechats')) return '커피챗'
  if (path.startsWith('/my/status') || path.startsWith('/teams/')) return '내 현황'
  if (path.startsWith('/mypage')) return '마이페이지'
  if (path.startsWith('/notifications')) return '알림'
  if (path.startsWith('/messages')) return '메시지'
  return null
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#F43F5E] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}

export function NavBar() {
  const navigate = useNavigate()
  const { path } = useLocation()
  const { user, badges } = useSession()
  const [query, setQuery] = useState('')
  const { toast, show } = useToast()

  const active = activeLabelFor(path)

  const handleNav = (label: string) => {
    switch (label) {
      case '홈':
        navigate(routes.hackathons)
        break
      case '추천': {
        // 마지막으로 본 해커톤이 없으면 먼저 해커톤을 고르게 한다
        const id = lastHackathonId()
        if (id) {
          navigate(routes.recommendations(id))
        } else {
          show('먼저 해커톤을 선택하면 추천을 볼 수 있어요')
          navigate(routes.hackathons)
        }
        break
      }
      case '커피챗':
        navigate(routes.coffeechats)
        break
      case '내 현황':
        navigate(routes.myStatus)
        break
      case '마이페이지':
        navigate(routes.mypage)
        break
    }
  }

  const submitSearch = () => {
    const q = query.trim()
    navigate(q ? `${routes.hackathons}?q=${encodeURIComponent(q)}` : routes.hackathons)
  }

  return (
    <header className="bg-white border-b border-[#E2EAF4] h-[52px] flex items-center px-6 gap-8 sticky top-0 z-50">
      <button
        onClick={() => navigate(routes.hackathons)}
        className="flex items-center gap-2 flex-shrink-0"
      >
        <LogoIcon size={36} />
        <span className="font-bold text-[15px] text-gray-800">ㅎㅋㅌ</span>
      </button>

      <nav className="flex items-center gap-1">
        {NAV_LABELS.map((item) => (
          <button
            key={item}
            onClick={() => handleNav(item)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              active === item
                ? 'text-[#0EA5E9] bg-[#F0F9FF]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <input
          type="text"
          placeholder="해커톤 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitSearch()
          }}
          className="bg-[#F0F5FC] border border-[#E2EAF4] rounded-lg px-3 py-1.5 text-[13px] w-52 outline-none focus:border-[#0EA5E9] placeholder-[#8FA3BF]"
        />

        <button
          onClick={() => navigate(routes.messages)}
          aria-label="메시지"
          className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            active === '메시지' ? 'bg-[#F0F9FF] text-[#0EA5E9]' : 'text-[#64748B] hover:bg-gray-100'
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V4z" />
          </svg>
          <Badge count={badges.unread_message_count} />
        </button>

        <button
          onClick={() => navigate(routes.notifications)}
          aria-label="알림"
          className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            active === '알림' ? 'bg-[#F0F9FF] text-[#0EA5E9]' : 'text-[#64748B] hover:bg-gray-100'
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 1.5a5.5 5.5 0 0 0-5.5 5.5v3l-1.5 2h14l-1.5-2V7A5.5 5.5 0 0 0 9 1.5z" />
            <path d="M7.5 14.5a1.5 1.5 0 0 0 3 0" />
          </svg>
          <Badge count={badges.unread_notification_count} />
        </button>

        <button
          onClick={() => navigate(routes.mypage)}
          className="w-8 h-8 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
        >
          {user?.initial || initialOf(user?.name, '나')}
        </button>
      </div>

      {toast}
    </header>
  )
}

/** 상단바 + 본문 컨테이너. 로그인 이후 화면들의 공통 껍데기. */
export function Page({
  children,
  width = 'narrow',
}: {
  children: React.ReactNode
  width?: 'narrow' | 'wide' | 'full'
}) {
  const maxWidth =
    width === 'wide' ? 'max-w-5xl' : width === 'full' ? 'max-w-none' : 'max-w-2xl'
  return (
    <div className="min-h-screen bg-[#EEF4FB]">
      <NavBar />
      <main className={`${maxWidth} mx-auto px-6 py-8`}>{children}</main>
    </div>
  )
}
