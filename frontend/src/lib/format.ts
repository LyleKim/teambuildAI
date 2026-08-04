/** 표시용 값 가공 헬퍼. 서버가 필드를 안 줬을 때의 fallback을 한곳에 모은다. */

/** 이름에서 아바타 이니셜을 만든다. 한글은 성 한 글자, 영문은 첫 글자. */
export function initialOf(name: string | undefined | null, fallback = '?'): string {
  if (!name) return fallback
  const trimmed = name.trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, 1)
}

/** 해커톤 기간 문자열. 서버가 date를 주면 그대로, 아니면 start/end로 조립한다. */
export function periodOf(item: { date?: string; start_date?: string; end_date?: string }): string {
  if (item.date) return item.date
  if (item.start_date && item.end_date) {
    return `${shortDate(item.start_date)} ~ ${shortDate(item.end_date)}`
  }
  return item.start_date ? shortDate(item.start_date) : ''
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 배너 그라디언트. 서버 color가 없으면 기본 톤을 쓴다. */
export function bannerGradient(color: string | undefined): string {
  return `linear-gradient(135deg, ${color || '#B8D9F5'} 0%, #DCE9F5 100%)`
}

/** 단일 선택 칩 그룹은 배열 UI를 쓰지만 서버로는 스칼라를 보낸다. */
export function toSingle(values: string[], fallback = ''): string {
  return values[0] ?? fallback
}

export function toArray(value: string | undefined | null): string[] {
  return value ? [value] : []
}
