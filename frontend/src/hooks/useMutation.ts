import { useCallback, useRef, useState } from 'react'
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

  // fn/options는 렌더마다 새로 만들어지는 인라인 함수라 컴포넌트 상태(예: 입력 필드 값)를
  // 클로저로 갖는 경우가 많다. ref로 매 렌더 최신 값을 갱신해두지 않으면 mutate가
  // 최초 렌더 시점의 낡은 클로저를 영원히 참조해 최신 상태를 무시하게 된다.
  const fnRef = useRef(fn)
  fnRef.current = fn
  const optionsRef = useRef(options)
  optionsRef.current = options

  const mutate = useCallback(async (args: TArgs): Promise<TData | null> => {
    setLoading(true)
    setError(null)
    try {
      const data = await fnRef.current(args)
      optionsRef.current.onSuccess?.(data, args)
      return data
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(0, String(err))
      setError(apiError)
      optionsRef.current.onError?.(apiError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setLoading(false)
  }, [])

  return { mutate, loading, error, reset }
}
