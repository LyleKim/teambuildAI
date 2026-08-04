import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/client'

export interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  refetch: () => void
  /** 서버 재요청 없이 로컬 데이터만 즉시 갱신 (낙관적 업데이트용) */
  setData: (updater: T | ((prev: T | null) => T | null)) => void
}

/**
 * 데이터 조회용 훅.
 *
 * `key`가 바뀌면 자동으로 재요청한다. fetcher를 useCallback으로 감쌀 필요가 없도록
 * 의존성 추적을 문자열 key 하나로 단순화했다.
 */
export function useQuery<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean } = {},
): QueryResult<T> {
  const { enabled = true } = options

  const [data, setDataState] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<ApiError | null>(null)
  const [nonce, setNonce] = useState(0)

  // fetcher는 매 렌더마다 새 함수일 수 있으므로 ref로 최신 값만 참조한다
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(null)

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (cancelled) return
        setDataState(result)
        setError(null)
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err : new ApiError(0, String(err)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [key, nonce, enabled])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  const setData = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setDataState((prev) =>
      typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater,
    )
  }, [])

  return { data, loading, error, refetch, setData }
}
