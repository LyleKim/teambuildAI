import type { ProfileInput } from "@/types"
import type { BioQuestion } from "@/lib/profileCategoryContent"

/** 상세 자기소개 5개 질문 아코디언. 문항 목록(bioQuestions)만 카테고리별로 다르고 UI는 동일하다. */
export function BioAccordionField({
  form,
  set,
  bioQuestions,
  bioOpen,
  setBioOpen,
}: {
  form: ProfileInput
  set: <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => void
  bioQuestions: BioQuestion[]
  bioOpen: boolean
  setBioOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
}) {
  return (
    <div className="mb-5">
      <button
        onClick={() => setBioOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[#0F172A]">
            상세 자기소개
          </p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#64748B"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={`transition-transform ${bioOpen ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <p className="text-[12px] text-[#64748B] mb-3">
        프로필 상세 페이지에 항목별로 표시돼요. 5개 항목 모두 작성해야 저장할 수
        있어요.
      </p>

      {bioOpen && (
        <div className="bg-white border border-[#E2EAF4] rounded-2xl overflow-hidden">
          {bioQuestions.map((q, idx) => (
            <div
              key={q.key}
              className={
                idx < bioQuestions.length - 1 ? "border-b border-[#F1F5F9]" : ""
              }
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[13px] font-semibold text-[#0F172A]">
                    {q.label}
                  </p>
                  <span className="text-[11px] text-[#F43F5E]">*</span>
                </div>
                <textarea
                  value={form[q.key]}
                  onChange={(e) => set(q.key, e.target.value)}
                  rows={2}
                  placeholder={q.placeholder}
                  className="w-full bg-[#F8FAFC] border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#0EA5E9] focus:bg-white resize-none placeholder-[#94A3B8] transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
