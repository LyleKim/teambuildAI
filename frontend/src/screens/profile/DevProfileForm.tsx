import { ChipGroup } from "@/components/ui"
import { toArray, toSingle } from "@/lib/format"
import { BioAccordionField } from "./BioAccordionField"
import { PortfolioLinksField } from "./PortfolioLinksField"
import type { ProfileFormProps } from "./types"

/** 개발자(백엔드/프론트엔드/AI-ML) 프로필 작성 화면. */
export function DevProfileForm({
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
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-semibold text-ink">
            한 줄 자기소개
          </p>
          <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
        </div>
        <p className="text-[12px] text-ink-soft mb-2">
          추천 카드에 표시되는 짧은 소개 (30자 이내 권장)
        </p>
        <input
          type="text"
          value={form.one_liner}
          onChange={(e) => set("one_liner", e.target.value)}
          maxLength={50}
          placeholder={oneLinerPlaceholder}
          className="w-full bg-white border border-border rounded-xl px-4 py-3 text-[14px] outline-none focus:border-brand"
        />
      </div>

      <ChipGroup
        label="기술 스택"
        options={skillOptions}
        selected={form.skills}
        onChange={(v) => set("skills", v)}
      />

      <div className="mb-5">
        <p className="text-[13px] font-semibold text-ink mb-1">
          포트폴리오 링크
        </p>
        <p className="text-[12px] text-ink-soft mb-3">
          GitHub, 블로그 등 여러 링크를 등록할 수 있어요.
        </p>
        <PortfolioLinksField
          links={form.links}
          addLink={addLink}
          removeLink={removeLink}
          updateLink={updateLink}
        />
      </div>

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
      <ChipGroup
        label="참여 목표"
        options={options.goals}
        selected={toArray(form.goal)}
        onChange={(v) => set("goal", toSingle(v))}
        multi={false}
      />
      <ChipGroup
        label="협업 방식"
        options={options.collaborations}
        selected={toArray(form.collaboration)}
        onChange={(v) => set("collaboration", toSingle(v))}
        multi={false}
      />

      <div className="mb-6 bg-brand/5 rounded-2xl border border-brand/20 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[13px] font-semibold text-ink">소통 방식</p>
          <span className="text-[11px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
            AI 체크포인트 반영
          </span>
        </div>
        <p className="text-[12px] text-ink-soft mb-3">
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
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-ink-soft border-border hover:border-brand"
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

      <BioAccordionField
        form={form}
        set={set}
        bioQuestions={bioQuestions}
        bioOpen={bioOpen}
        setBioOpen={setBioOpen}
      />
    </>
  )
}
