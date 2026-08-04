import { useEffect, useRef, useState } from 'react'
import { chatApi } from '@/api'
import { NavBar } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { Avatar, InlineError } from '@/components/ui'
import { useSession } from '@/context/SessionContext'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { CHAT_POLL_INTERVAL } from '@/lib/constants'
import { initialOf } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'
import type { ChatMessage } from '@/types'

export function ChatScreen({ threadId }: { threadId: number }) {
  const navigate = useNavigate()
  const { refreshBadges } = useSession()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const thread = useQuery(`chat:thread:${threadId}`, () => chatApi.thread(threadId))
  const messages = useQuery(`chat:messages:${threadId}`, () => chatApi.messages(threadId))

  // 대화방에 들어오면 읽음 처리하고 상단바 배지를 갱신한다
  useEffect(() => {
    chatApi
      .markRead(threadId)
      .then(() => refreshBadges())
      .catch(() => {
        /* 읽음 처리 실패는 대화 자체를 막지 않는다 */
      })
  }, [threadId, refreshBadges])

  // 새 메시지 폴링
  useEffect(() => {
    const timer = window.setInterval(messages.refetch, CHAT_POLL_INTERVAL)
    return () => window.clearInterval(timer)
  }, [messages.refetch])

  const list = messages.data ?? []

  // 메시지가 늘어나면 항상 맨 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [list.length])

  const send = useMutation((text: string) => chatApi.send(threadId, text), {
    onSuccess: (sent) => {
      messages.setData((prev) => [...(prev ?? []), sent])
      setInput('')
    },
  })

  const submit = () => {
    const text = input.trim()
    if (!text || send.loading) return
    void send.mutate(text)
  }

  if (thread.loading) {
    return (
      <div className="min-h-screen bg-[#EEF4FB]">
        <NavBar />
        <LoadingState />
      </div>
    )
  }

  if (thread.error || !thread.data) {
    return (
      <div className="min-h-screen bg-[#EEF4FB]">
        <NavBar />
        <ErrorState error={thread.error} onRetry={thread.refetch} />
      </div>
    )
  }

  const t = thread.data
  const avatarInitial = t.initial || initialOf(t.name)

  // 날짜가 바뀌는 지점에 구분선을 넣기 위해 직전 메시지의 날짜를 추적한다
  let lastDate = ''

  return (
    <div className="min-h-screen bg-[#EEF4FB] flex flex-col">
      <NavBar />

      <div className="bg-white border-b border-[#E2EAF4] px-6 py-3 flex items-center gap-3 sticky top-[52px] z-40">
        <button
          onClick={() => navigate(routes.messages)}
          className="text-[#4EAAF5] text-[13px] font-medium hover:underline mr-1"
        >
          ←
        </button>
        <Avatar initial={avatarInitial} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-[#0F172A] leading-tight truncate">{t.name}</p>
          <p className="text-[11px] text-[#64748B] truncate">
            {t.role} · {t.hackathon}
          </p>
        </div>
        <button
          onClick={() => navigate(routes.member(t.person_id))}
          className="text-[12px] text-[#0EA5E9] font-medium hover:underline flex-shrink-0"
        >
          프로필 보기
        </button>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-6 flex flex-col gap-1 pb-28">
        {messages.loading && !messages.data && <LoadingState label="대화를 불러오는 중이에요…" />}

        {messages.error && !messages.data && (
          <ErrorState error={messages.error} onRetry={messages.refetch} />
        )}

        {list.length === 0 && !messages.loading && !messages.error && (
          <p className="text-center text-[13px] text-[#94A3B8] py-16">
            첫 메시지를 보내 대화를 시작해보세요.
          </p>
        )}

        {list.map((m: ChatMessage) => {
          const showDate = m.date !== lastDate
          lastDate = m.date
          const mine = m.from === 'me'
          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#E2EAF4]" />
                  <span className="text-[11px] text-[#94A3B8] font-medium px-2">{m.date}</span>
                  <div className="flex-1 h-px bg-[#E2EAF4]" />
                </div>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
                {!mine && (
                  <div className="mr-2 self-end mb-0.5">
                    <Avatar initial={avatarInitial} size={28} />
                  </div>
                )}
                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                      mine
                        ? 'bg-[#0EA5E9] text-white rounded-br-sm'
                        : 'bg-[#F0F9FF] text-[#0F172A] border border-[#E0F2FE] rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 px-1">{m.time}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2EAF4] px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto">
          <InlineError message={send.error?.message} />
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="메시지를 입력하세요…"
              className="flex-1 bg-[#F0F5FC] border border-[#E2EAF4] rounded-full px-5 py-2.5 text-[14px] outline-none focus:border-[#0EA5E9] placeholder-[#8FA3BF]"
            />
            <button
              onClick={submit}
              disabled={send.loading || !input.trim()}
              aria-label="보내기"
              className="w-10 h-10 bg-[#0EA5E9] hover:bg-[#0284C7] rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm disabled:bg-[#BAE6FD] disabled:cursor-not-allowed"
            >
              {send.loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2L2 8l4.5 2L10 6l-2 4.5L14 14 14 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
