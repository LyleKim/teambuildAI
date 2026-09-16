import { LINK_META } from "@/lib/constants"
import type { LinkType, PortfolioLink } from "@/types"

/** 포트폴리오 링크 읽기 전용 표시. */
export function LinksView({ links }: { links: PortfolioLink[] }) {
  if (links.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link, i) => {
        const meta = LINK_META[(link.type as LinkType)] ?? LINK_META["기타"]
        return (
          <a
            key={`${link.type}-${i}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 border rounded-full px-4 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-75 ${meta.color} ${meta.bg} ${meta.border}`}
          >
            <span className="text-[14px]">{meta.icon}</span>
            {link.type}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="opacity-50"
            >
              <path d="M2 8L8 2M4 2h4v4" />
            </svg>
          </a>
        )
      })}
    </div>
  )
}
