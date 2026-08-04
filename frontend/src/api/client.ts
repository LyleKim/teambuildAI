/**
 * HTTP 클라이언트.
 *
 * 모든 요청은 `/api/v1` 로 나가고, Vite dev 서버가 이를 Django(8000)로 프록시한다.
 * (vite.config.ts 의 server.proxy 참고)
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const ACCESS_KEY = 'favicon.access_token'
const REFRESH_KEY = 'favicon.refresh_token'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isUnauthorized() {
    return this.status === 401
  }
}

// ─── 토큰 저장소 ──────────────────────────────────────────────────────────────

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** 토큰이 만료돼 로그아웃 처리가 필요할 때 호출되는 콜백 (SessionProvider가 등록) */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────

/** Django 세션 인증을 함께 쓸 경우를 대비한 CSRF 토큰 추출 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${BASE_URL}${path}`
  if (!params) return url

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

/** DRF의 다양한 에러 응답 형태에서 사람이 읽을 메시지를 뽑아낸다. */
function extractMessage(status: number, data: unknown): string {
  if (typeof data === 'string' && data) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const direct = obj.detail ?? obj.message ?? obj.error
    if (typeof direct === 'string') return direct

    // { field: ["에러 메시지"] } 형태의 필드 검증 에러
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
      if (typeof value === 'string') return value
    }
  }
  if (status === 0) return '서버에 연결할 수 없습니다. 백엔드(:8000)가 실행 중인지 확인해주세요.'
  if (status === 404) return '요청한 데이터를 찾을 수 없습니다.'
  if (status >= 500) return '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
  return `요청에 실패했습니다. (HTTP ${status})`
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ─── 토큰 갱신 ────────────────────────────────────────────────────────────────

/** 동시에 여러 요청이 401을 받아도 refresh는 한 번만 수행하도록 공유한다. */
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh
  if (!refresh) return null

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl('/auth/token/refresh/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        })
        if (!res.ok) return null
        const data = (await parseBody(res)) as { access?: string } | null
        if (!data?.access) return null
        tokenStore.set(data.access)
        return data.access
      } catch {
        return null
      } finally {
        // 다음 401에서 다시 시도할 수 있도록 해제
        setTimeout(() => {
          refreshPromise = null
        }, 0)
      }
    })()
  }
  return refreshPromise
}

// ─── 요청 ─────────────────────────────────────────────────────────────────────

export type QueryParams = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions {
  params?: QueryParams
  body?: unknown
  signal?: AbortSignal
  /** false면 Authorization 헤더를 붙이지 않는다 */
  auth?: boolean
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { params, body, signal, auth = true } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = auth ? tokenStore.access : null
  if (token) headers.Authorization = `Bearer ${token}`

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRFToken'] = csrf
  }

  let res: Response
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      signal,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    // 요청이 취소된 경우는 그대로 던져서 useQuery가 무시하게 한다
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, extractMessage(0, null))
  }

  if (res.ok) {
    return (await parseBody(res)) as T
  }

  // access 토큰 만료 → 한 번만 갱신 후 재시도
  if (res.status === 401 && auth && !isRetry) {
    const newToken = await refreshAccessToken()
    if (newToken) return request<T>(method, path, options, true)
    tokenStore.clear()
    onUnauthorized?.()
  }

  const data = await parseBody(res)
  throw new ApiError(res.status, extractMessage(res.status, data), data)
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}

/** DRF 페이지네이션 응답과 순수 배열 응답을 모두 배열로 정규화한다. */
export function toList<T>(data: T[] | { results: T[] } | null | undefined): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}
