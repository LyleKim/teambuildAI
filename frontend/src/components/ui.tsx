/** 화면 전반에서 재사용하는 프리미티브 컴포넌트 모음. */
import { useState } from 'react'
import type { ReactNode } from 'react'
import logo from '@/assets/logo.png'
import { COFFEECHAT_STATUS_BADGE } from '@/lib/constants'
import type { CoffeeChatStatus } from '@/types'

export function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="파비콘"
      width={size}
      height={size}
      className="rounded-[22%] object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

export function Avatar({
  initial,
  size = 40,
  className = '',
  verified = false,
}: {
  initial: string
  size?: number
  className?: string
  /** 받은 리뷰 5개 이상일 때 우측 하단에 작은 인증 체크마크를 얹는다. */
  verified?: boolean
}) {
  const badgeSize = Math.max(12, Math.round(size * 0.32))
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full rounded-full bg-[#0EA5E9] flex items-center justify-center text-white font-bold ${className}`}
        style={{ fontSize: Math.round(size * 0.35) }}
      >
        {initial}
      </div>
      {verified && (
        <span
          title="받은 리뷰 5개 이상 (인증)"
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-[#0EA5E9] border-2 border-white"
          style={{ width: badgeSize, height: badgeSize }}
        >
          <svg width="65%" height="65%" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.2l2.3 2.3L9.5 3.5" />
          </svg>
        </span>
      )}
    </div>
  )
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[#4EAAF5] text-[13px] font-medium hover:underline mb-6"
    >
      ← {label}
    </button>
  )
}

export function ChipGroup({
  label,
  options,
  selected,
  onChange,
  multi = true,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  multi?: boolean
}) {
  const toggle = (opt: string) => {
    if (multi) {
      onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
    } else {
      onChange(selected.includes(opt) ? [] : [opt])
    }
  }
  return (
    <div className="mb-6">
      <p className="text-[13px] font-semibold text-gray-700 mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
              selected.includes(opt)
                ? 'bg-[#4EAAF5] text-white border-[#4EAAF5]'
                : 'bg-white text-gray-500 border-[#E2EAF4] hover:border-[#4EAAF5]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
        value ? 'bg-[#4EAAF5]' : 'bg-[#D0DCE8]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-[#E2EAF4] px-5 py-3.5">
      <span className="text-[14px] text-gray-700">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-full border border-[#4EAAF5] text-[#4EAAF5] flex items-center justify-center text-lg leading-none hover:bg-blue-50 transition-colors"
        >
          −
        </button>
        <span className="text-[14px] font-semibold text-gray-800 w-4 text-center">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full border border-[#4EAAF5] text-[#4EAAF5] flex items-center justify-center text-lg leading-none hover:bg-blue-50 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function ScoreRing({ score }: { score: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circ
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E2EAF4" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="#4EAAF5"
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[13px] font-bold text-[#4EAAF5] leading-none">{score}점</span>
        <span className="text-[9px] text-[#8FA3BF]">매칭</span>
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: CoffeeChatStatus }) {
  const badge = COFFEECHAT_STATUS_BADGE[status]
  if (!badge) return null
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
      {badge.label}
    </span>
  )
}

export function PrimaryButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}) {
  const inactive = disabled || loading
  return (
    <button
      onClick={onClick}
      disabled={inactive}
      className={`bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-[15px] rounded-xl py-3.5 transition-colors shadow-sm disabled:bg-[#BAE6FD] disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      )}
      {children}
    </button>
  )
}

/** 폼 하단에 API 에러를 노출하는 인라인 배너 */
export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl px-4 py-3 mb-3">
      <p className="text-[13px] text-[#E11D48]">{message}</p>
    </div>
  )
}

/** 저장 성공 등을 잠깐 알리는 토스트 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  const show = (text: string, ms = 2200) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), ms)
  }

  const toast = message ? (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-[#0F172A] text-white text-[13px] font-medium px-5 py-3 rounded-full shadow-lg">
      {message}
    </div>
  ) : null

  return { toast, show }
}
