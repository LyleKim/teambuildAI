import { statsApi } from '@/api'
import { LogoIcon } from '@/components/ui'
import { useQuery } from '@/hooks/useQuery'
import { routes, useNavigate } from '@/lib/router'

const FEATURES = [
  {
    title: 'AI 매칭 추천',
    desc: '기술 스택, 활동 시간, 목표까지 분석해 매칭 점수와 근거를 함께 보여줘요.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="white" stroke="none" />
        <circle cx="5" cy="18" r="2" fill="white" stroke="none" />
        <circle cx="19" cy="18" r="2" fill="white" stroke="none" />
        <path d="M5 18c3-3 6-4 7-4s4 1 7 4" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    title: '커피챗으로 연결',
    desc: '가벼운 인사와 함께 커피챗을 신청하고, 수락되면 바로 연락처가 열려요.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a3 3 0 0 1 0 6h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <path d="M6 2v3M10 2v3M14 2v3" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    title: '개인 · 팀 모두 지원',
    desc: '팀을 찾는 개인도, 팀원을 구하는 모집자도 같은 흐름으로 매칭받아요.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="7" r="2.5" strokeOpacity="0.7" />
        <path d="M2 20c0-4 3.13-7 7-7s7 3 7 7" />
        <path d="M16 13.5c1-.35 2.1-.5 3-.5 2.8 0 5 1.8 5 5" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    title: '참가 현황 관리',
    desc: '모집 중 · 매칭 완료 · 재모집까지, 참가 상태를 한 곳에서 관리해요.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" strokeOpacity="0.7" />
        <circle cx="16" cy="16" r="4" fill="#4EAAF5" stroke="white" strokeWidth="1.5" />
        <path d="M14.5 16l1 1 2-2" strokeWidth="1.5" />
      </svg>
    ),
  },
]

const STEPS = [
  { step: 'STEP 01', title: '해커톤 선택', desc: '관심 있는 해커톤을 탐색하고 참가 방식(개인/팀)을 선택해요.' },
  { step: 'STEP 02', title: '프로필 · 조건 작성', desc: '역할, 스택, 활동 방식 등 희망 조건을 입력하면 AI가 분석을 시작해요.' },
  { step: 'STEP 03', title: '추천 & 커피챗', desc: '매칭 점수가 높은 상대에게 커피챗을 신청하고 팀을 완성해요.' },
]

export function LandingScreen() {
  const navigate = useNavigate()

  // 통계는 부가 정보라 실패해도 화면을 막지 않고 '—' 로 표시한다
  const { data: stats } = useQuery('stats:landing', () => statsApi.landing())

  const statItems: [string, string][] = [
    [stats ? `${stats.total_participants}+` : '—', '누적 참가자'],
    [stats ? `${stats.recruiting_teams}개` : '—', '모집 중인 팀'],
    [stats ? `${stats.active_hackathons}개` : '—', '진행 중인 해커톤'],
    [stats ? `${stats.satisfaction_rate}%` : '—', '평균 매칭 만족도'],
  ]

  const start = () => navigate(routes.login)

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-[60px] bg-white/80 backdrop-blur-md border-b border-[#E8EFF8]">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={28} />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[16px] text-gray-800">파비콘</span>
            <span className="text-[10px] font-medium text-[#4EAAF5] tracking-wide mt-0.5">Favorite contact</span>
          </div>
        </div>
        <button
          onClick={start}
          className="bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white text-[13px] font-semibold px-5 py-2 rounded-xl transition-colors"
        >
          시작하기
        </button>
      </header>

      {/* Hero */}
      <section
        className="relative pt-[60px] min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ background: 'linear-gradient(175deg, #EAF3FD 0%, #F5F9FF 50%, #EDF2FB 100%)' }}
      >
        <div className="absolute top-20 left-12 w-48 h-48 rounded-full opacity-60 pointer-events-none" style={{ background: 'radial-gradient(circle, #A8D8F8 0%, transparent 70%)', filter: 'blur(32px)' }} />
        <div className="absolute top-32 right-16 w-40 h-40 rounded-full opacity-50 pointer-events-none" style={{ background: 'radial-gradient(circle, #7EC8F6 0%, transparent 70%)', filter: 'blur(28px)' }} />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/80 border border-[#D0E8F8] rounded-full px-4 py-1.5 mb-6 shadow-sm">
            <span className="text-[#4EAAF5] text-[12px]">✦</span>
            <span className="text-[12px] font-medium text-gray-500">
              <span className="text-[#4EAAF5] font-semibold">파비콘</span>
              <span className="text-gray-300 mx-1.5">·</span>
              <span className="italic text-gray-400">Favorite contact</span>
              <span className="text-gray-300 mx-1.5">·</span>
              AI 팀 매칭 플랫폼
            </span>
          </div>

          <h1 className="text-[52px] font-black leading-tight tracking-tight text-gray-900 mb-2">AI로 만나는</h1>
          <h1 className="text-[52px] font-black leading-tight tracking-tight mb-6">
            <span className="text-[#4EAAF5]">우리 팀</span>
            <span className="text-gray-900">, 해커톤 팀 빌딩</span>
          </h1>
          <p className="text-[16px] text-gray-500 leading-relaxed mb-10 max-w-lg mx-auto">
            참가자와 팀 모집자를 AI가 매칭하고, 커피챗으로 이어줘요.
            <br />
            해커톤 팀 구하기, 이제 감이 아니라 데이터로.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={start}
              className="bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white font-bold text-[15px] px-8 py-3.5 rounded-2xl transition-colors shadow-md shadow-blue-200"
            >
              지금 팀 찾기 시작하기
            </button>
            <button
              onClick={() => navigate(routes.hackathons)}
              className="bg-white/80 hover:bg-white border border-[#D0E4F5] text-gray-700 font-semibold text-[15px] px-8 py-3.5 rounded-2xl transition-colors"
            >
              해커톤 둘러보기
            </button>
          </div>

          <div className="mt-10 grid grid-cols-4 gap-6">
            {statItems.map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-[26px] font-black text-[#4EAAF5]">{num}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-black tracking-widest text-[#4EAAF5] uppercase mb-3">Features</p>
            <h2 className="text-[36px] font-black text-gray-900">팀 빌딩에 필요한 모든 것</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map(({ title, desc, icon }) => (
              <div key={title} className="bg-[#F5F8FD] rounded-2xl p-7 border border-[#E8EFF8]">
                <div className="w-12 h-12 rounded-2xl bg-[#4EAAF5] mb-5 flex items-center justify-center shadow-sm shadow-blue-200">
                  {icon}
                </div>
                <h3 className="font-bold text-[17px] text-gray-900 mb-2">{title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(180deg, #E8F3FD 0%, #EEF6FF 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-black tracking-widest text-[#4EAAF5] uppercase mb-3">How it works</p>
            <h2 className="text-[36px] font-black text-gray-900">3단계면 팀이 완성돼요</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-2xl p-6 border border-[#D8EAF8] shadow-sm">
                <p className="text-[11px] font-black text-[#4EAAF5] tracking-widest mb-3">{step}</p>
                <h3 className="font-bold text-[16px] text-gray-900 mb-2">{title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center" style={{ background: 'linear-gradient(135deg, #4EAAF5 0%, #2D8FE0 100%)' }}>
        <h2 className="text-[34px] font-black text-white mb-3">다음 해커톤, 좋은 팀과 함께하세요</h2>
        <p className="text-[15px] text-blue-100 mb-10">가벼운 1분, 매칭은 AI가 대신해요</p>
        <button
          onClick={start}
          className="inline-flex items-center gap-2.5 bg-[#FEE500] hover:bg-[#F5DB00] text-gray-800 font-bold text-[15px] px-10 py-4 rounded-2xl transition-colors shadow-lg"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="#3A1D1D" fillOpacity="0.85" />
            <path d="M9 4.5C6.52 4.5 4.5 6.1 4.5 8.08c0 1.27.8 2.38 2 3.05l-.48 1.74c-.04.13.1.24.21.16L8.1 11.6a5.3 5.3 0 00.9.07c2.48 0 4.5-1.6 4.5-3.58S11.48 4.5 9 4.5z" fill="white" />
          </svg>
          카카오로 시작하기
        </button>
      </section>

      <footer className="bg-white border-t border-[#E8EFF8] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoIcon size={24} />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[13px] text-gray-700">파비콘</span>
            <span className="text-[10px] font-medium text-[#4EAAF5] tracking-wide mt-0.5">Favorite contact</span>
          </div>
        </div>
        <p className="text-[12px] text-gray-400">© 2026 Favorite contact. All rights reserved.</p>
      </footer>
    </div>
  )
}
