import { BioItemsView } from "./BioItemsView"
import { LinksView } from "./LinksView"
import type { ProfileViewProps } from "./types"

/** 개발자 공개 프로필: 기술 스택 + 포트폴리오 링크를 상단에 강조한다. */
export function DevProfileView({ data, bioQuestions }: ProfileViewProps) {
  return (
    <>
      {data.one_liner && (
        <p className="text-[14px] text-ink-soft mb-5 leading-relaxed">
          {data.one_liner}
        </p>
      )}

      {data.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {data.skills.map((s) => (
            <span
              key={s}
              className="bg-white border border-border text-ink-soft text-[13px] px-3 py-1 rounded-lg"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {data.links.length > 0 && (
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-ink mb-2.5">
            포트폴리오
          </p>
          <LinksView links={data.links} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {([
          ["활동 가능 시간", data.available_time],
          ["참여 목표", data.goal],
          ["협업 방식", data.collaboration],
          ["소통 방식", data.communication],
        ] as [string, string][]).map(([label, value]) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-[11px] text-ink-soft mb-1">{label}</p>
            <p className="text-[14px] font-semibold text-ink">
              {value || "—"}
            </p>
          </div>
        ))}
      </div>

      {data.interests.length > 0 && (
        <div className="mb-5">
          <p className="text-[13px] font-semibold text-ink mb-2">
            관심 분야
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.interests.map((i) => (
              <span
                key={i}
                className="bg-border/60 text-ink-soft text-[12px] font-semibold px-3 py-1 rounded-full"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      <BioItemsView data={data} bioQuestions={bioQuestions} />
    </>
  )
}
