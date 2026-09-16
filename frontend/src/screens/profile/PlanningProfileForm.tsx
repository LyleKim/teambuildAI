import { ChipGroup } from "@/components/ui"
import { toArray, toSingle } from "@/lib/format"
import { BioAccordionField } from "./BioAccordionField"
import { PortfolioLinksField } from "./PortfolioLinksField"
import type { ProfileFormProps } from "./types"

/** 기획자 프로필 작성 화면. */
export function PlanningProfileForm({
  form,
  set,
  options,
  skillOptions,
  bioQuestions,
  oneLinerPlaceholder,
  bioOpen,
  setBioOpen,
  addLink,
  removeLink,
  updateLink,
}: ProfileFormProps) {
  return (
    <>
      <div className="mb-5 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-4">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">
          포트폴리오 링크
        </p>
        <p className="text-[12px] text-[#64748B] mb-3">
          Notion 기획서, 블로그 등 링크를 등록해주세요.
        </p>
        <PortfolioLinksField
          links={form.links}
          addLink={addLink}
          removeLink={removeLink}
          updateLink={updateLink}
        />
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-semibold text-[#0F172A]">
            한 줄 자기소개
          </p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-2">
          추천 카드에 표시되는 짧은 소개 (30자 이내 권장)
        </p>
        <input
          type="text"
          value={form.one_liner}
          onChange={(e) => set("one_liner", e.target.value)}
          maxLength={50}
          placeholder={oneLinerPlaceholder}
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      <BioAccordionField
        form={form}
        set={set}
        bioQuestions={bioQuestions}
        bioOpen={bioOpen}
        setBioOpen={setBioOpen}
      />

      <ChipGroup
        label="참여 목표"
        options={options.goals}
        selected={toArray(form.goal)}
        onChange={(v) => set("goal", toSingle(v))}
        multi={false}
      />

      <ChipGroup
        label="기술 스택"
        options={skillOptions}
        selected={form.skills}
        onChange={(v) => set("skills", v)}
      />

      <ChipGroup
        label="활동 가능 시간"
        options={options.available_times}
        selected={toArray(form.available_time)}
        onChange={(v) => set("available_time", toSingle(v))}
        multi={false}
      />
      <ChipGroup
        label="선호 지역"
        options={options.regions}
        selected={form.regions}
        onChange={(v) => set("regions", v)}
      />

      <div className="mb-6 bg-[#F0F9FF] rounded-2xl border border-[#BAE6FD] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[13px] font-semibold text-[#0F172A]">소통 방식</p>
          <span className="text-[11px] font-semibold text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
            AI 체크포인트 반영
          </span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-3">
          이 항목은 AI 추천 카드의 '체크 포인트' 근거로 사용돼요. 팀원 간 소통
          스타일 불일치를 미리 알려드려요.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.communications.map((opt) => (
            <button
              key={opt}
              onClick={() => set("communication", opt)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                form.communication === opt
                  ? "bg-[#0EA5E9] text-white border-[#0EA5E9]"
                  : "bg-white text-[#64748B] border-[#E2EAF4] hover:border-[#0EA5E9]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <ChipGroup
        label="관심 분야"
        options={options.interests}
        selected={form.interests}
        onChange={(v) => set("interests", v)}
      />
    </>
  )
}
