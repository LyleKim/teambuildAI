import { statsApi } from "@/api"
import { LogoIcon } from "@/components/ui"
import { useQuery } from "@/hooks/useQuery"
import { routes, useNavigate } from "@/lib/router"

// 랜딩 페이지 전용 토큰. 앱 전역(--color-brand 등)과 의도적으로 분리해뒀다 —
// 다른 화면까지 같이 바뀌지 않게, 여기서만 쓰는 색/서체를 인라인으로 관리한다.
const INK = "#101828"
const INK_SOFT = "#5B6472"
const BONE = "#FFFFFF"
const SPARK = "#2D8FE0"
const LINE = "#E2EAF4"
const display = { fontFamily: "'Do Hyeon', sans-serif" }
const body = { fontFamily: "'Gothic A1', sans-serif" }

const FEATURES = [
  {
    title: "AI 매칭 추천",
    desc: "기술 스택, 활동 시간, 목표까지 분석해 매칭 점수와 근거를 함께 보여줘요.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="white" stroke="none" />
        <circle cx="5" cy="18" r="2" fill="white" stroke="none" />
        <circle cx="19" cy="18" r="2" fill="white" stroke="none" />
        <path d="M5 18c3-3 6-4 7-4s4 1 7 4" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    title: "커피챗으로 연결",
    desc: "가벼운 인사와 함께 커피챗을 신청하고, 수락되면 바로 연락처가 열려요.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 8h1a3 3 0 0 1 0 6h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <path d="M6 2v3M10 2v3M14 2v3" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    title: "개인 · 팀 모두 지원",
    desc: "팀을 찾는 개인도, 팀원을 구하는 모집자도 같은 흐름으로 매칭받아요.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="7" r="2.5" strokeOpacity="0.7" />
        <path d="M2 20c0-4 3.13-7 7-7s7 3 7 7" />
        <path d="M16 13.5c1-.35 2.1-.5 3-.5 2.8 0 5 1.8 5 5" strokeOpacity="0.7" />
      </svg>
    ),
  },
  {
    title: "참가 현황 관리",
    desc: "모집 중 · 매칭 완료 · 재모집까지, 참가 상태를 한 곳에서 관리해요.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" strokeOpacity="0.7" />
      </svg>
    ),
  },
]

const STEPS = [
  { n: "1", title: "해커톤 선택", desc: "관심 있는 해커톤을 탐색하고 참가 방식(개인/팀)을 선택해요." },
  { n: "2", title: "프로필 · 조건 작성", desc: "역할, 스택, 활동 방식 등 희망 조건을 입력하면 AI가 분석을 시작해요." },
  { n: "3", title: "추천 & 커피챗", desc: "매칭 점수가 높은 상대에게 커피챗을 신청하고 팀을 완성해요." },
]

/** 히어로의 핵심 비주얼 — 장식이 아니라 실제 기능(두 사람을 AI가 점수로 이어준다)을 그대로 그린다. */
function MatchingCard() {
  return (
    <div className="relative w-full max-w-[300px] mx-auto lg:mx-0">
      <div
        className="rounded-[4px] border p-4 flex items-center gap-3 bg-white"
        style={{ borderColor: LINE }}
      >
        <div className="w-11 h-11 rounded-full bg-[#E2EFFD] flex items-center justify-center font-bold text-[15px]" style={{ color: SPARK, ...body }}>
          도
        </div>
        <div style={body}>
          <p className="font-bold text-[14px]" style={{ color: INK }}>김도현</p>
          <p className="text-[12px]" style={{ color: INK_SOFT }}>백엔드 · React, Django</p>
        </div>
      </div>

      <div className="relative h-14 flex items-center justify-center">
        <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ backgroundColor: LINE, transform: "translateX(-0.5px)" }} />
        <div
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-bold text-[15px] text-white shadow-lg"
          style={{ backgroundColor: SPARK, ...display }}
        >
          92
        </div>
      </div>

      <div
        className="rounded-[4px] border p-4 flex items-center gap-3 bg-white"
        style={{ borderColor: LINE }}
      >
        <div className="w-11 h-11 rounded-full bg-[#E2EFFD] flex items-center justify-center font-bold text-[15px]" style={{ color: SPARK, ...body }}>
          서
        </div>
        <div style={body}>
          <p className="font-bold text-[14px]" style={{ color: INK }}>이서연</p>
          <p className="text-[12px]" style={{ color: INK_SOFT }}>프로덕트 디자인 · Figma</p>
        </div>
      </div>

      <p className="text-center text-[12px] mt-3" style={{ color: INK_SOFT, ...body }}>
        기술 스택이 겹치지 않고 활동 시간이 맞아요
      </p>
    </div>
  )
}

export function LandingScreen() {
  const navigate = useNavigate()

  // 통계는 부가 정보라 실패해도 화면을 막지 않고 '—' 로 표시한다
  const { data: stats } = useQuery("stats:landing", () => statsApi.landing())

  const statItems: [string, string][] = [
    [stats ? `${stats.total_participants}+` : "—", "누적 참가자"],
    [stats ? `${stats.recruiting_teams}개` : "—", "모집 중인 팀"],
    [stats ? `${stats.active_hackathons}개` : "—", "진행 중인 해커톤"],
    [stats ? `${stats.satisfaction_rate}%` : "—", "평균 매칭 만족도"],
  ]

  const start = () => navigate(routes.login)

  return (
    <div className="min-h-screen" style={{ backgroundColor: BONE, ...body }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-8 h-[64px] backdrop-blur-md border-b"
        style={{ backgroundColor: "rgba(255,255,255,0.85)", borderColor: LINE }}
      >
        <div className="flex items-center gap-2.5">
          <LogoIcon size={32} />
          <span className="font-bold text-[17px]" style={{ color: INK, ...display }}>
            파비콘
          </span>
        </div>
        <button
          onClick={start}
          className="text-white text-[13px] font-bold px-5 py-2.5 rounded-[4px] transition-opacity hover:opacity-90"
          style={{ backgroundColor: INK }}
        >
          시작하기
        </button>
      </header>

      {/* Hero */}
      <section className="pt-[64px] px-6 sm:px-10">
        <div className="max-w-5xl mx-auto py-16 sm:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <p className="text-[13px] font-semibold mb-5" style={{ color: SPARK }}>
              대학생 해커톤 팀 빌딩
            </p>
            <h1
              className="text-[42px] sm:text-[58px] leading-[1.08] mb-6"
              style={{ color: INK, ...display }}
            >
              팀원을 고르지 않고,
              <br />
              소개받으세요
            </h1>
            <p className="text-[16px] leading-relaxed mb-10 max-w-md" style={{ color: INK_SOFT }}>
              AI가 스택과 활동 시간, 참여 목적을 보고 먼저 어울리는 사람을 찾아요.
              마음에 들면 커피챗 한 번으로 팀이 시작돼요.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-14">
              <button
                onClick={start}
                className="text-white font-bold text-[15px] px-7 py-3.5 rounded-[4px] transition-opacity hover:opacity-90"
                style={{ backgroundColor: SPARK }}
              >
                지금 팀 찾기 시작하기
              </button>
              <button
                onClick={() => navigate(routes.hackathons)}
                className="border font-bold text-[15px] px-7 py-3.5 rounded-[4px] transition-colors hover:bg-white"
                style={{ borderColor: INK, color: INK }}
              >
                해커톤 둘러보기
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-md">
              {statItems.map(([num, label]) => (
                <div key={label}>
                  <div className="text-[22px] font-bold" style={{ color: INK, ...display }}>
                    {num}
                  </div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: INK_SOFT }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <MatchingCard />
        </div>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-10 py-20 border-t" style={{ borderColor: LINE }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[28px] sm:text-[32px] mb-12" style={{ color: INK, ...display }}>
            팀 빌딩에 필요한 모든 것
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ backgroundColor: LINE }}>
            {FEATURES.map(({ title, desc, icon }) => (
              <div key={title} className="p-7" style={{ backgroundColor: BONE }}>
                <div
                  className="w-10 h-10 rounded-[4px] mb-5 flex items-center justify-center"
                  style={{ backgroundColor: SPARK }}
                >
                  {icon}
                </div>
                <h3 className="font-bold text-[16px] mb-2" style={{ color: INK }}>
                  {title}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: INK_SOFT }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — 실제 순차 플로우라 숫자를 쓴다 */}
      <section className="px-6 sm:px-10 py-20 border-t" style={{ borderColor: LINE }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[28px] sm:text-[32px] mb-12" style={{ color: INK, ...display }}>
            3단계면 팀이 완성돼요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n}>
                <p className="text-[44px] leading-none mb-4" style={{ color: SPARK, ...display }}>
                  {n}
                </p>
                <h3 className="font-bold text-[16px] mb-2" style={{ color: INK }}>
                  {title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: INK_SOFT }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-10 py-20 text-center" style={{ backgroundColor: INK }}>
        <h2 className="text-[28px] sm:text-[34px] mb-3" style={{ color: "#FAF9F6", ...display }}>
          다음 해커톤, <span style={{ color: SPARK }}>좋은 팀</span>과 함께하세요
        </h2>
        <p className="text-[15px] mb-10" style={{ color: "#9C9A92" }}>
          가벼운 1분, 매칭은 AI가 대신해요
        </p>
        <button
          onClick={start}
          className="inline-flex items-center gap-2.5 text-[#3A1D1D] font-bold text-[15px] px-9 py-3.5 rounded-[4px] transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FEE500" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="#3A1D1D" fillOpacity="0.85" />
            <path
              d="M9 4.5C6.52 4.5 4.5 6.1 4.5 8.08c0 1.27.8 2.38 2 3.05l-.48 1.74c-.04.13.1.24.21.16L8.1 11.6a5.3 5.3 0 00.9.07c2.48 0 4.5-1.6 4.5-3.58S11.48 4.5 9 4.5z"
              fill="white"
            />
          </svg>
          카카오로 시작하기
        </button>
      </section>

      <footer className="px-6 sm:px-10 py-6 flex items-center justify-between border-t" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-2">
          <LogoIcon size={22} />
          <span className="font-bold text-[13px]" style={{ color: INK, ...display }}>파비콘</span>
        </div>
        <p className="text-[12px]" style={{ color: INK_SOFT }}>
          © 2026 파비콘. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
