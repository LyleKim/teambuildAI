import { useState } from 'react'
import { coffeechatApi } from '@/api'
import { useMutation } from '@/hooks/useMutation'
import { initialOf } from '@/lib/format'
import { Avatar, InlineError } from './ui'

export interface CoffeeChatTarget {
  userId: number
  name: string
  initial?: string
  role: string
}

/**
 * 커피챗 신청 모달.
 *
 * 문구는 기본값을 채워주되 자유롭게 수정할 수 있다.
 * 오픈채팅 링크는 서버가 내 프로필 기준으로 자동 첨부하므로 여기서 따로 다루지 않는다.
 * 신청 성공 시 onSent를 호출해 호출한 화면이 목록/버튼 상태를 갱신하게 한다.
 */
export function CoffeeChatModal({
  target,
  hackathonId,
  onClose,
  onSent,
}: {
  target: CoffeeChatTarget
  hackathonId: number
  onClose: () => void
  onSent: (userId: number) => void
}) {
  const [message, setMessage] = useState(
    `안녕하세요! ${target.role} 스택이 저희 팀과 잘 맞는 것 같아 커피챗 신청드려요.`,
  )

  const send = useMutation(
    () =>
      coffeechatApi.send({
        to_user_id: target.userId,
        hackathon_id: hackathonId,
        message: message.trim(),
      }),
    { onSuccess: () => onSent(target.userId) },
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(80,100,130,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <Avatar initial={target.initial || initialOf(target.name)} size={40} />
          <div>
            <p className="font-bold text-[15px] text-gray-800">{target.name}</p>
            <p className="text-[12px] text-[#8FA3BF]">{target.role}</p>
          </div>
        </div>

        <p className="text-[13px] font-semibold text-gray-700 mb-2">신청 인사말</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#4EAAF5] resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-[#94A3B8]">내 프로필의 오픈채팅 링크가 함께 전달돼요.</p>
          <p className="text-[11px] text-[#94A3B8]">{message.length}/300</p>
        </div>

        <div className="mt-3">
          <InlineError message={send.error?.message} />
        </div>

        <div className="flex gap-3 mt-1">
          <button
            onClick={onClose}
            disabled={send.loading}
            className="flex-1 border border-[#E2EAF4] rounded-xl py-2.5 text-[14px] font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => send.mutate(undefined as void)}
            disabled={send.loading || !message.trim()}
            className="flex-1 bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors disabled:bg-[#BAE6FD] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {send.loading && (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            신청 보내기
          </button>
        </div>
      </div>
    </div>
  )
}
