import { useState } from 'react'
import { coffeechatApi, hackathonApi, manualParticipantApi, participationApi, reviewApi, todoApi } from '@/api'
import type { ApiError } from '@/api/client'
import { Page } from '@/components/NavBar'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Avatar, BackButton, InlineError, StatusBadge, useToast } from '@/components/ui'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { initialOf } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'
import type { ManualParticipant, Review, Teammate } from '@/types'

const STARS = [1, 2, 3, 4, 5]

/** 리뷰 작성/수정 폼. 별점 + 텍스트. */
function ReviewForm({
  teammate,
  hackathonId,
  onClose,
  onSaved,
}: {
  teammate: Teammate
  hackathonId: number
  onClose: () => void
  onSaved: (review: Review) => void
}) {
  const [rating, setRating] = useState(teammate.my_review?.rating ?? 5)
  const [content, setContent] = useState(teammate.my_review?.content ?? '')

  const save = useMutation(
    () =>
      reviewApi.save({
        hackathon_id: hackathonId,
        reviewee_id: teammate.counterpart.id,
        rating,
        content: content.trim(),
      }),
    { onSuccess: onSaved },
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
          <Avatar initial={teammate.counterpart.initial || initialOf(teammate.counterpart.name)} size={40} />
          <div>
            <p className="font-bold text-[15px] text-gray-800">{teammate.counterpart.name}</p>
            <p className="text-[12px] text-[#8FA3BF]">{teammate.counterpart.role}</p>
          </div>
        </div>

        <p className="text-[13px] font-semibold text-gray-700 mb-2">평점</p>
        <div className="flex gap-1 mb-4">
          {STARS.map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n}점`}
              className="text-[26px] leading-none transition-transform hover:scale-110"
            >
              {n <= rating ? '⭐' : '☆'}
            </button>
          ))}
        </div>

        <p className="text-[13px] font-semibold text-gray-700 mb-2">후기</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="같이 활동하면서 느낀 점을 남겨주세요"
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#4EAAF5] resize-none"
        />

        <div className="mt-3">
          <InlineError message={save.error?.message} />
        </div>

        <div className="flex gap-3 mt-1">
          <button
            onClick={onClose}
            disabled={save.loading}
            className="flex-1 border border-[#E2EAF4] rounded-xl py-2.5 text-[14px] font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => save.mutate(undefined as void)}
            disabled={save.loading}
            className="flex-1 bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors disabled:bg-[#BAE6FD] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {save.loading && (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            )}
            {teammate.my_review ? '리뷰 수정하기' : '리뷰 저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TeamSpaceScreen({ hackathonId }: { hackathonId: number }) {
  const navigate = useNavigate()
  const { toast, show } = useToast()
  const [reviewTarget, setReviewTarget] = useState<Teammate | null>(null)
  const [newTodo, setNewTodo] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [needsManualDetails, setNeedsManualDetails] = useState(false)

  const hackathon = useQuery(`hackathon:${hackathonId}`, () => hackathonApi.detail(hackathonId))
  const teammates = useQuery(`teammates:${hackathonId}`, () => coffeechatApi.teammates(hackathonId))
  const todos = useQuery(`todos:${hackathonId}`, () => todoApi.list(hackathonId))
  const manualParticipants = useQuery(`manual-participants:${hackathonId}`, () =>
    manualParticipantApi.list(hackathonId),
  )

  const progress = useMutation(
    ({ id, status }: { id: number; status: 'in_progress' | 'completed' }) =>
      coffeechatApi.setProgress(id, status),
    {
      onSuccess: (updated) =>
        teammates.setData((prev) => (prev ?? []).map((t) => (t.id === updated.id ? { ...t, ...updated } : t))),
    },
  )

  const removeTeammate = useMutation((id: number) => coffeechatApi.remove(id), {
    onSuccess: (_void, id) => teammates.setData((prev) => (prev ?? []).filter((t) => t.id !== id)),
  })

  const addTodo = useMutation(() => todoApi.create(hackathonId, newTodo.trim()), {
    onSuccess: (created) => {
      todos.setData((prev) => [...(prev ?? []), created])
      setNewTodo('')
    },
  })

  const toggleTodo = useMutation(
    ({ id, isDone }: { id: number; isDone: boolean }) => todoApi.toggle(id, isDone),
    {
      onSuccess: (updated) =>
        todos.setData((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t))),
    },
  )

  const removeTodo = useMutation((id: number) => todoApi.remove(id), {
    onSuccess: (_void, id) => todos.setData((prev) => (prev ?? []).filter((t) => t.id !== id)),
  })

  const resetManualForm = () => {
    setManualPhone('')
    setManualName('')
    setManualEmail('')
    setNeedsManualDetails(false)
  }

  const addManual = useMutation(
    () =>
      manualParticipantApi.add(hackathonId, {
        phone: manualPhone.trim(),
        name: manualName.trim(),
        email: manualEmail.trim(),
      }),
    {
      onSuccess: (created) => {
        manualParticipants.setData((prev) => [created, ...(prev ?? [])])
        resetManualForm()
        show(`${created.name}님을 추가했어요`)
      },
      onError: (err: ApiError) => {
        // 회원이 아니면 서버가 not_member 필드로 알려준다 — 이름/이메일 입력칸을 마저 보여준다
        if (err.data && typeof err.data === 'object' && 'not_member' in err.data) {
          setNeedsManualDetails(true)
        }
      },
    },
  )

  const removeManual = useMutation((id: number) => manualParticipantApi.remove(id), {
    onSuccess: (_void, id) =>
      manualParticipants.setData((prev) => (prev ?? []).filter((p) => p.id !== id)),
  })

  const deleteTeamEntry = (entry: TeamEntry) => {
    if (!window.confirm('팀원 목록에서 삭제할까요? 되돌릴 수 없어요.')) return
    if (entry.kind === 'coffeechat') removeTeammate.mutate(entry.data.id)
    else removeManual.mutate(entry.data.id)
  }

  const participations = useQuery('me:participations', () => participationApi.mine())
  const myParticipation = (participations.data ?? []).find((p) => p.hackathon.id === hackathonId) ?? null

  const endProject = useMutation(() => participationApi.end(myParticipation!.id), {
    onSuccess: (updated) =>
      participations.setData((prev) =>
        (prev ?? []).map((p) => (p.id === updated.id ? updated : p)),
      ),
  })

  const teammateList = teammates.data ?? []
  const todoList = todos.data ?? []
  const manualParticipantList = manualParticipants.data ?? []

  // 커피챗 매칭 / 수동 추가 둘 다 같은 "팀원" 목록에 시간순으로 섞어서 보여준다
  type TeamEntry =
    | { kind: 'coffeechat'; key: string; createdAt: string; data: Teammate }
    | { kind: 'manual'; key: string; createdAt: string; data: ManualParticipant }
  const teamEntries: TeamEntry[] = [
    ...teammateList.map((t): TeamEntry => ({ kind: 'coffeechat', key: `cc-${t.id}`, createdAt: t.created_at, data: t })),
    ...manualParticipantList.map((p): TeamEntry => ({ kind: 'manual', key: `mp-${p.id}`, createdAt: p.created_at, data: p })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const teamSectionLoading = teammates.loading || manualParticipants.loading
  const teamSectionError = teammates.error ?? manualParticipants.error
  const teamSectionRefetch = () => {
    teammates.refetch()
    manualParticipants.refetch()
  }

  return (
    <Page>
      {toast}
      <BackButton label="내 현황으로" onClick={() => navigate(routes.myStatus)} />

      {hackathon.loading && <LoadingState />}
      {!hackathon.loading && hackathon.error && (
        <ErrorState error={hackathon.error} onRetry={hackathon.refetch} />
      )}

      {!hackathon.loading && !hackathon.error && hackathon.data && (
        <>
          <h1 className="text-[20px] font-bold text-[#0F172A] mb-1">{hackathon.data.title}</h1>
          <p className="text-[13px] text-[#64748B] mb-6">팀원과 진행 상황을 관리해요</p>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-[#0F172A]">팀원</h2>
              <button
                onClick={() => navigate(routes.recommendations(hackathonId))}
                className="text-[13px] font-semibold text-[#0EA5E9] hover:underline"
              >
                참가자 추천 →
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2EAF4] p-5 mb-3">
              <p className="text-[13px] font-semibold text-gray-700 mb-2">수동으로 참가자 추가</p>

              <InlineError message={addManual.error?.message} />

              <div className="flex gap-2 mb-2">
                <input
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  disabled={needsManualDetails}
                  placeholder="전화번호 (010-1234-5678)"
                  className="flex-1 min-w-0 bg-white border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#4EAAF5] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                />
                {!needsManualDetails && (
                  <button
                    onClick={() => addManual.mutate(undefined as void)}
                    disabled={addManual.loading || !manualPhone.trim()}
                    className="bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:bg-[#BAE6FD] disabled:cursor-not-allowed flex-shrink-0"
                  >
                    확인
                  </button>
                )}
              </div>

              {needsManualDetails && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="이름"
                      className="flex-1 min-w-0 bg-white border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#4EAAF5]"
                    />
                    <input
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      type="email"
                      placeholder="이메일"
                      className="flex-1 min-w-0 bg-white border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#4EAAF5]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetManualForm}
                      className="border border-[#E2EAF4] rounded-xl px-5 py-2.5 text-[14px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => addManual.mutate(undefined as void)}
                      disabled={addManual.loading || !manualName.trim() || !manualEmail.trim()}
                      className="flex-1 bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:bg-[#BAE6FD] disabled:cursor-not-allowed"
                    >
                      추가
                    </button>
                  </div>
                </>
              )}
            </div>

            <InlineError message={removeTeammate.error?.message ?? removeManual.error?.message ?? progress.error?.message} />

            {teamSectionLoading && <LoadingState />}
            {!teamSectionLoading && teamSectionError && (
              <ErrorState error={teamSectionError} onRetry={teamSectionRefetch} />
            )}
            {!teamSectionLoading && !teamSectionError && teamEntries.length === 0 && (
              <EmptyState
                title="아직 팀원이 없어요"
                description="커피챗이 수락되거나, 위에서 직접 추가하면 여기 나타나요."
              />
            )}

            {teamEntries.length > 0 && (
              <div className="flex flex-col gap-3">
                {teamEntries.map((entry) =>
                  entry.kind === 'coffeechat' ? (
                    <div key={entry.key} className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <button onClick={() => navigate(routes.member(entry.data.counterpart.id))}>
                          <Avatar
                            initial={entry.data.counterpart.initial || initialOf(entry.data.counterpart.name)}
                            size={40}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-[14px] text-[#0F172A] truncate">
                              {entry.data.counterpart.name}{' '}
                              <span className="text-[#64748B] font-normal">· {entry.data.counterpart.role}</span>
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={entry.data.status} />
                              <button
                                onClick={() => deleteTeamEntry(entry)}
                                disabled={removeTeammate.loading}
                                aria-label="삭제"
                                className="text-[#94A3B8] hover:text-[#F43F5E] transition-colors disabled:opacity-40"
                              >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 4h11M5.5 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M6 7v4M9 7v4M3.5 4l.6 8a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {entry.data.sender_contact && (
                            <a
                              href={entry.data.sender_contact}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[12px] font-medium text-[#0EA5E9] hover:underline"
                            >
                              💬 오픈채팅 링크
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {entry.data.thread_id && (
                          <button
                            onClick={() => navigate(routes.thread(entry.data.thread_id!))}
                            className="border border-[#E2EAF4] rounded-xl px-4 py-2 text-[13px] font-semibold text-[#0EA5E9] hover:bg-[#F0F9FF] transition-colors"
                          >
                            대화 열기
                          </button>
                        )}
                        {entry.data.status === 'accepted' && (
                          <button
                            onClick={() => progress.mutate({ id: entry.data.id, status: 'in_progress' })}
                            disabled={progress.loading}
                            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60"
                          >
                            진행중으로 표시
                          </button>
                        )}
                        <button
                          onClick={() => setReviewTarget(entry.data)}
                          className="ml-auto border border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] rounded-xl px-4 py-2 text-[13px] font-semibold hover:bg-[#FEF3C7] transition-colors"
                        >
                          {entry.data.my_review ? '✏️ 리뷰 수정하기' : '⭐ 리뷰 작성하기'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={entry.key} className="bg-white rounded-2xl border border-[#E2EAF4] p-5">
                      <div className="flex items-center gap-3">
                        <Avatar initial={initialOf(entry.data.name)} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[14px] text-[#0F172A] flex items-center gap-1.5">
                            {entry.data.name}
                            {entry.data.is_member && (
                              <span className="text-[10px] font-semibold text-[#0EA5E9] bg-[#E0F2FE] px-1.5 py-0.5 rounded-full">
                                회원
                              </span>
                            )}
                          </p>
                          <p className="text-[12px] text-[#94A3B8] truncate">
                            {entry.data.phone}
                            {entry.data.email ? ` · ${entry.data.email}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteTeamEntry(entry)}
                          disabled={removeManual.loading}
                          aria-label="삭제"
                          className="text-[#94A3B8] hover:text-[#F43F5E] transition-colors flex-shrink-0 disabled:opacity-40"
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h11M5.5 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M6 7v4M9 7v4M3.5 4l.6 8a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-[#0F172A] mb-3">내 할 일</h2>

            <InlineError message={addTodo.error?.message ?? toggleTodo.error?.message ?? removeTodo.error?.message} />

            <div className="flex gap-2 mb-4">
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTodo.trim()) addTodo.mutate(undefined as void)
                }}
                placeholder="할 일을 입력하세요"
                maxLength={200}
                className="flex-1 min-w-0 bg-white border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#4EAAF5]"
              />
              <button
                onClick={() => addTodo.mutate(undefined as void)}
                disabled={addTodo.loading || !newTodo.trim()}
                className="bg-[#4EAAF5] hover:bg-[#2D8FE0] text-white rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:bg-[#BAE6FD] disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>

            {todos.loading && <LoadingState />}
            {!todos.loading && todos.error && <ErrorState error={todos.error} onRetry={todos.refetch} />}
            {!todos.loading && !todos.error && todoList.length === 0 && (
              <p className="text-[13px] text-[#94A3B8] text-center py-8">아직 등록한 할 일이 없어요.</p>
            )}

            {todoList.length > 0 && (
              <div className="flex flex-col gap-2">
                {todoList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white rounded-xl border border-[#E2EAF4] px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={(e) => toggleTodo.mutate({ id: item.id, isDone: e.target.checked })}
                      className="w-4 h-4 accent-[#4EAAF5] flex-shrink-0"
                    />
                    <span
                      className={`flex-1 text-[14px] ${item.is_done ? 'line-through text-[#94A3B8]' : 'text-gray-700'}`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => removeTodo.mutate(item.id)}
                      aria-label="삭제"
                      className="text-[#94A3B8] hover:text-[#F43F5E] transition-colors flex-shrink-0"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4h11M5.5 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M6 7v4M9 7v4M3.5 4l.6 8a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-10 pt-6 border-t border-[#E2EAF4]">
            <InlineError message={endProject.error?.message} />
            {myParticipation?.ended_at ? (
              <div className="bg-[#F1F5F9] border border-[#E2EAF4] rounded-xl px-5 py-4 text-center">
                <p className="text-[13px] font-semibold text-[#64748B]">✅ 종료된 프로젝트예요</p>
                <p className="text-[12px] text-[#94A3B8] mt-1">
                  팀원과 할 일 목록은 계속 확인할 수 있어요.
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm('이 프로젝트를 종료할까요? 팀원·할 일 기록은 그대로 남아요.')) {
                    endProject.mutate(undefined as void)
                  }
                }}
                disabled={!myParticipation || endProject.loading}
                className="w-full border border-[#E2EAF4] rounded-xl py-3 text-[14px] font-semibold text-[#64748B] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                프로젝트 종료하기
              </button>
            )}
          </div>
        </>
      )}

      {reviewTarget && (
        <ReviewForm
          teammate={reviewTarget}
          hackathonId={hackathonId}
          onClose={() => setReviewTarget(null)}
          onSaved={(saved) => {
            teammates.setData((prev) =>
              (prev ?? []).map((t) =>
                t.id === reviewTarget.id ? { ...t, my_review: { rating: saved.rating, content: saved.content } } : t,
              ),
            )
            setReviewTarget(null)
            show('리뷰를 저장했어요')
          }}
        />
      )}
    </Page>
  )
}
