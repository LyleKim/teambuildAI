import type { BioQuestion } from "@/lib/profileCategoryContent"
import type { MemberProfile } from "@/types"

/** 자기소개 5문항 읽기 전용 표시. 문항 라벨(bioQuestions)만 카테고리별로 다르다. */
export function BioItemsView({
  data,
  bioQuestions,
}: {
  data: MemberProfile
  bioQuestions: BioQuestion[]
}) {
  const bioItems = bioQuestions
    .map((q) => ({ label: q.label, value: data[q.key] }))
    .filter((item) => item.value)

  return (
    <div className="mb-6">
      <p className="text-[13px] font-semibold text-ink mb-3">자기소개</p>
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {bioItems.length > 0 ? (
          bioItems.map((q, idx) => (
            <div
              key={q.label}
              className={`px-5 py-4 ${
                idx < bioItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <p className="text-[11px] font-semibold text-ink-soft mb-1">
                {q.label}
              </p>
              <p className="text-[14px] text-ink leading-relaxed">
                {q.value}
              </p>
            </div>
          ))
        ) : (
          <div className="px-5 py-4">
            <p className="text-[14px] text-ink-soft leading-relaxed">
              아직 작성된 자기소개가 없어요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
