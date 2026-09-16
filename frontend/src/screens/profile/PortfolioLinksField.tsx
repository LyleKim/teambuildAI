import { LINK_META } from "@/lib/constants"
import { LINK_TYPES } from "@/types"
import type { LinkType, PortfolioLink } from "@/types"

/** 포트폴리오 링크 추가/수정/삭제 UI. */
export function PortfolioLinksField({
  links,
  addLink,
  removeLink,
  updateLink,
}: {
  links: PortfolioLink[]
  addLink: () => void
  removeLink: (index: number) => void
  updateLink: (index: number, patch: Partial<PortfolioLink>) => void
}) {
  return (
    <div>
      <div className="flex flex-col gap-2">
        {links.map((link, i) => {
          const meta = LINK_META[link.type] ?? LINK_META["기타"]
          return (
            <div key={i} className="flex items-center gap-2">
              <select
                value={link.type}
                onChange={(e) =>
                  updateLink(i, { type: e.target.value as LinkType })
                }
                className="bg-white border border-[#E2EAF4] rounded-xl px-3 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#0EA5E9] cursor-pointer flex-shrink-0 w-[120px]"
              >
                {LINK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LINK_META[t].icon} {t}
                  </option>
                ))}
              </select>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">
                  {meta.icon}
                </span>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  placeholder="https://"
                  className="w-full bg-white border border-[#E2EAF4] rounded-xl pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-[#0EA5E9] placeholder-[#94A3B8]"
                />
              </div>
              <button
                onClick={() => removeLink(i)}
                aria-label="링크 삭제"
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#FFF1F2] hover:text-[#F43F5E] transition-colors flex-shrink-0"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={addLink}
        className="mt-2 flex items-center gap-1.5 text-[#0EA5E9] text-[13px] font-medium hover:text-[#0284C7] transition-colors py-1"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M7 2v10M2 7h10" />
        </svg>
        링크 추가
      </button>
    </div>
  )
}
