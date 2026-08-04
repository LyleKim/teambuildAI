/** 로딩 / 에러 / 빈 상태를 화면마다 다시 만들지 않도록 모아둔 컴포넌트. */
import type { ReactNode } from 'react'
import type { ApiError } from '@/api/client'

export function LoadingState({ label = '불러오는 중이에요…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-20 gap-5">
      <div className="w-12 h-12 rounded-full border-4 border-[#E0F2FE] border-t-[#0EA5E9] animate-spin" />
      <p className="text-[14px] font-medium text-[#64748B]">{label}</p>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError | Error | null
  onRetry?: () => void
}) {
  if (!error) return null

  // 백엔드가 안 떠 있을 때가 개발 중 가장 흔한 실패라 안내를 따로 준다
  const isOffline = 'status' in error && (error as ApiError).status === 0

  return (
    <div className="flex flex-col items-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFF1F2] flex items-center justify-center">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F43F5E"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5v.5" />
        </svg>
      </div>
      <p className="text-[16px] font-bold text-[#0F172A]">
        {isOffline ? '서버에 연결할 수 없어요' : '데이터를 불러오지 못했어요'}
      </p>
      <p className="text-[13px] text-[#64748B] leading-relaxed max-w-sm">{error.message}</p>
      {isOffline && (
        <p className="text-[12px] text-[#94A3B8] font-mono bg-[#F8FAFC] border border-[#E2EAF4] rounded-lg px-3 py-2">
          cd backend && uv run python manage.py runserver 8000
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[14px] px-8 py-3 rounded-xl transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#E0F2FE] flex items-center justify-center">
        {icon ?? (
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 20V8a2 2 0 012-2h16a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 4z" />
          </svg>
        )}
      </div>
      <p className="text-[16px] font-bold text-[#0F172A]">{title}</p>
      {description && (
        <p className="text-[13px] text-[#64748B] leading-relaxed whitespace-pre-line">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}

/** AI 추천 카드 로딩 스켈레톤 */
export function RecommendationSkeleton() {
  return (
    <div className="w-full flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E2EAF4] p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#E0F2FE]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-[#E0F2FE] rounded-full w-24" />
              <div className="h-3 bg-[#E0F2FE] rounded-full w-40" />
            </div>
            <div className="w-14 h-14 rounded-full bg-[#E0F2FE]" />
          </div>
          <div className="space-y-2">
            <div className="h-10 bg-[#F0F9FF] rounded-xl" />
            <div className="h-10 bg-[#F0F9FF] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 해커톤 카드 그리드 스켈레톤 */
export function HackathonCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden border border-[#E2EAF4] animate-pulse"
        >
          <div className="h-40 bg-[#E0F2FE]" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-[#E0F2FE] rounded-full w-20" />
            <div className="h-4 bg-[#E0F2FE] rounded-full w-full" />
            <div className="h-3 bg-[#F0F9FF] rounded-full w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
