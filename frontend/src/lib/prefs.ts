/**
 * 마지막으로 본 해커톤 id를 기억한다.
 *
 * 상단바의 '추천' 탭은 해커톤별 추천 결과로 가야 하는데 탭 자체에는 컨텍스트가 없다.
 * 상세/추천 화면을 지날 때 id를 기록해두고 탭에서 재사용한다.
 */
const LAST_HACKATHON_KEY = 'favicon.last_hackathon_id'

export function rememberHackathon(id: number) {
  try {
    localStorage.setItem(LAST_HACKATHON_KEY, String(id))
  } catch {
    // 사파리 프라이빗 모드 등 저장 불가 환경 — 기억 못 해도 동작에는 지장 없다
  }
}

export function lastHackathonId(): number | null {
  try {
    const raw = localStorage.getItem(LAST_HACKATHON_KEY)
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}
