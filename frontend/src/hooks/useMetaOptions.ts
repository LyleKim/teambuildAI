import { metaApi } from '@/api'
import { DEFAULT_META_OPTIONS } from '@/lib/constants'
import type { MetaOptions } from '@/types'
import { useQuery } from './useQuery'

/**
 * 칩/셀렉트 선택지를 서버에서 가져온다.
 *
 * 이 값들은 화면 골격을 좌우하므로 요청이 실패해도 기본값으로 렌더링을 이어간다.
 * (프로필 화면이 통째로 비는 것보다 낫다)
 */
export function useMetaOptions(): { options: MetaOptions; loading: boolean } {
  const { data, loading } = useQuery<MetaOptions>('meta:options', () => metaApi.options())

  return {
    options: data ? { ...DEFAULT_META_OPTIONS, ...data } : DEFAULT_META_OPTIONS,
    loading,
  }
}
