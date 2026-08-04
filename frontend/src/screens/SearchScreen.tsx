import { useEffect, useState } from 'react'
import { hackathonApi } from '@/api'
import { NavBar } from '@/components/NavBar'
import { EmptyState, ErrorState, HackathonCardSkeleton } from '@/components/states'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useQuery } from '@/hooks/useQuery'
import { bannerGradient, periodOf } from '@/lib/format'
import { rememberHackathon } from '@/lib/prefs'
import { routes, useLocation, useNavigate } from '@/lib/router'

/**
 * 해커톤 탐색.
 *
 * 검색어/카테고리는 서버 필터로 넘긴다(쿼리스트링). 클라이언트에서 자르지 않으므로
 * 데이터가 늘어나도 페이지네이션만 붙이면 된다.
 */
export function SearchScreen() {
  const navigate = useNavigate()
  const { query: urlQuery } = useLocation()
  const { options } = useMetaOptions()

  const [category, setCategory] = useState('전체')
  const [input, setInput] = useState(urlQuery.get('q') ?? '')
  // 입력할 때마다 요청하지 않도록 디바운스된 값을 따로 둔다
  const [search, setSearch] = useState(urlQuery.get('q') ?? '')

  // 상단바 검색으로 들어온 q 파라미터를 반영
  useEffect(() => {
    const q = urlQuery.get('q') ?? ''
    setInput(q)
    setSearch(q)
  }, [urlQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(input), 300)
    return () => window.clearTimeout(timer)
  }, [input])

  const { data, loading, error, refetch } = useQuery(
    `hackathons:${category}:${search}`,
    () => hackathonApi.list({ q: search, category }),
  )

  const hackathons = data ?? []

  const openDetail = (id: number) => {
    rememberHackathon(id)
    navigate(routes.hackathon(id))
  }

  return (
    <div className="min-h-screen bg-[#EEF4FB]">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800">해커톤 탐색</h1>
        <p className="text-[14px] text-[#8FA3BF] mt-1">참가하고 싶은 해커톤을 찾아보세요</p>

        <input
          type="text"
          placeholder="해커톤 검색"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full mt-5 bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#4EAAF5] placeholder-[#B8C9D9] shadow-sm"
        />

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {options.categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                category === cat
                  ? 'bg-[#4EAAF5] text-white border-[#4EAAF5]'
                  : 'bg-white text-gray-500 border-[#E2EAF4] hover:border-[#4EAAF5]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <HackathonCardSkeleton />}

        {!loading && error && <ErrorState error={error} onRetry={refetch} />}

        {!loading && !error && hackathons.length === 0 && (
          <EmptyState
            title="검색 결과가 없어요"
            description={
              search
                ? `'${search}' 와 일치하는 해커톤을 찾지 못했어요.`
                : '아직 등록된 해커톤이 없어요.'
            }
          />
        )}

        {!loading && !error && hackathons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {hackathons.map((h) => (
              <button
                key={h.id}
                onClick={() => openDetail(h.id)}
                className="bg-white rounded-2xl overflow-hidden border border-[#E2EAF4] text-left hover:shadow-md hover:border-[#B8D9F5] transition-all duration-200 group"
              >
                <div
                  className="h-40 flex items-center justify-center bg-cover bg-center"
                  style={
                    h.banner_url
                      ? { backgroundImage: `url(${h.banner_url})` }
                      : { background: bannerGradient(h.color) }
                  }
                >
                  {!h.banner_url && <span className="text-[#8FA3BF] text-[13px]">배너 이미지</span>}
                </div>
                <div className="p-4">
                  <div className="flex gap-1.5 mb-2">
                    <span className="bg-blue-100 text-[#4EAAF5] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      {h.category}
                    </span>
                    <span className="bg-green-50 text-green-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      {h.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-[14px] text-gray-800 group-hover:text-[#4EAAF5] transition-colors">
                    {h.title}
                  </h3>
                  <p className="text-[12px] text-[#8FA3BF] mt-1">{periodOf(h)}</p>
                  <p className="text-[12px] text-[#8FA3BF]">참가 인원 {h.participants}명</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
