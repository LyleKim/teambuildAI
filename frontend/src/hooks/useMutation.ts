import { useCallback, useState } from 'react'
import { ApiError } from '@/api/client'

export interface MutationResult<TArgs, TData> {
  mutate: (args: TArgs) => Promise<TData | null>
  loading: boolean
  error: ApiError | null
  reset: () => void
}

/**
 * 생성/수정/삭제용 훅.
 *
 * mutate는 성공 시 응답을, 실패 시 null을 반환하고 error 상태를 채운다.
 * 호출부에서 try/catch를 반복하지 않기 위한 선택이다.
 */
export function useMutation<TArgs, TData>(
  fn: (args: TArgs) => Promise<TData>,
  options: { onSuccess?: (data: TData, args: TArgs) => void; onError?: (error: ApiError) => void } = {},
): MutationResult<TArgs, TData> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = useCallback(
    async (args: TArgs): Promise<TData | null> => {
      setLoading(true)
      setError(null)
      try {
        const data = await fn(args)
        options.onSuccess?.(data, args)
        return data
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError(0, String(err))
        setError(apiError)
        options.onError?.(apiError)
        return null
      } finally {
        setLoading(false)
      }
    },
    // fn/options는 렌더마다 새로 만들어지는 인라인 함수인 경우가 많아 의존성에서 제외한다.
    // 대신 항상 최신 클로저를 쓰도록 mutate를 매 렌더 재생성하지 않고 내부에서만 참조한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const reset = useCallback(() => {
    setError(null)
    setLoading(false)
  }, [])

  return { mutate, loading, error, reset }
}
