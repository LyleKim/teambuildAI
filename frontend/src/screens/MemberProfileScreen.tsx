import { useState } from "react"
import { profileApi } from "@/api"
import { CoffeeChatModal } from "@/components/CoffeeChatModal"
import { Page } from "@/components/NavBar"
import { ErrorState, LoadingState } from "@/components/states"
import { Avatar, BackButton, StatusBadge, useToast } from "@/components/ui"
import { useMetaOptions } from "@/hooks/useMetaOptions"
import { useProfileCategory } from "@/hooks/useProfileCategory"
import { initialOf } from "@/lib/format"
import { lastHackathonId } from "@/lib/prefs"
import { useQuery } from "@/hooks/useQuery"
import { useLocation } from "@/lib/router"
import { DesignProfileView } from "./profile/DesignProfileView"
import { DevProfileView } from "./profile/DevProfileView"
import { PlanningProfileView } from "./profile/PlanningProfileView"

export function MemberProfileScreen({ userId }: { userId: number }) {
  const { query } = useLocation()
  const { toast, show } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const { options } = useMetaOptions()

  // 커피챗은 해커톤 단위라 컨텍스트가 필요하다.
  // 링크에 hackathon 파라미터가 있으면 그걸, 없으면 마지막으로 본 해커톤을 쓴다.
  const hackathonId = Number(query.get("hackathon")) || lastHackathonId()

  const { data, loading, error, refetch, setData } = useQuery(
    `profile:${userId}`,
    () => profileApi.member(userId),
  )

  const { primaryCategory, bioQuestions } = useProfileCategory(
    data?.roles ?? [],
    options,
  )

  return (
    <Page>
      {toast}
      <BackButton label="뒤로" onClick={() => window.history.back()} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Avatar initial={data.initial || initialOf(data.name)} size={64} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-[family-name:var(--font-display)] text-ink">
                  {data.name}
                </h1>
                {data.review_summary.count > 0 && (
                  <span className="text-[13px] font-semibold text-ink-soft bg-border/60 px-2.5 py-0.5 rounded-full">
                    ⭐ {data.review_summary.average} (
                    {data.review_summary.count})
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {data.roles.map((r) => (
                  <span
                    key={r}
                    className="bg-brand/10 text-brand text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {primaryCategory === "design" ? (
            <DesignProfileView data={data} bioQuestions={bioQuestions} />
          ) : primaryCategory === "planning" ? (
            <PlanningProfileView data={data} bioQuestions={bioQuestions} />
          ) : (
            <DevProfileView data={data} bioQuestions={bioQuestions} />
          )}

          {data.reviews.length > 0 && (
            <div className="mb-6">
              <p className="text-[13px] font-semibold text-ink mb-3">
                받은 리뷰
              </p>
              <div className="flex flex-col gap-2">
                {data.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[12px] font-semibold text-ink">
                        {r.reviewer_name}
                        <span className="text-ink-soft font-normal ml-1.5">
                          · {r.hackathon.title}
                        </span>
                      </p>
                      <span className="text-[12px] font-bold text-ink flex-shrink-0">
                        {"⭐".repeat(r.rating)}
                      </span>
                    </div>
                    {r.content && (
                      <p className="text-[13px] text-ink-soft leading-relaxed">
                        {r.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 연락처 — 서버가 커피챗 수락 전에는 null로 내려준다 */}
          <div className="rounded-xl border px-5 py-3.5 mb-4 flex items-center gap-3 bg-white border-border">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className={data.open_chat ? "text-brand" : "text-ink-soft"}
            >
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            {data.open_chat ? (
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-brand">
                  오픈채팅/연락처
                </p>
                <a
                  href={data.open_chat}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-brand underline break-all"
                >
                  {data.open_chat}
                </a>
              </div>
            ) : (
              <div>
                <p className="text-[12px] font-semibold text-ink-soft">
                  오픈채팅/연락처
                </p>
                <p className="text-[12px] text-ink-soft">
                  커피챗 수락 후 공개
                </p>
              </div>
            )}
          </div>

          {data.coffeechat_sent ? (
            <div className="w-full bg-border/60 border border-border rounded-xl py-3.5 flex items-center justify-center gap-2">
              <span className="text-[14px] font-semibold text-ink-soft">
                커피챗 신청함
              </span>
              {data.coffeechat_status && (
                <StatusBadge status={data.coffeechat_status} />
              )}
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              disabled={!hackathonId}
              title={hackathonId ? undefined : "해커톤을 먼저 선택해주세요"}
              className="w-full bg-brand hover:bg-brand-dark text-white font-semibold text-[15px] rounded-xl py-3.5 transition-colors shadow-sm disabled:bg-brand/40 disabled:cursor-not-allowed"
            >
              커피챗 신청하기
            </button>
          )}

          {modalOpen && hackathonId && (
            <CoffeeChatModal
              target={{
                userId: data.id,
                name: data.name,
                initial: data.initial || initialOf(data.name),
                role: data.roles[0] ?? "팀원",
              }}
              hackathonId={hackathonId}
              onClose={() => setModalOpen(false)}
              onSent={() => {
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        coffeechat_sent: true,
                        coffeechat_status: "pending",
                      }
                    : prev,
                )
                setModalOpen(false)
                show("커피챗 신청을 보냈어요")
              }}
            />
          )}
        </>
      )}
    </Page>
  )
}
