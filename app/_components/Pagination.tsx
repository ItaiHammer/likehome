import Link from "next/link";
import { visiblePages } from "@/lib/pagination";

type PaginationSize = "md" | "sm";

// sm is the Message Hub's: borderless, a 25px square on the current page (44px tap areas on phones)
const looks: Record<PaginationSize, { nav: string; step: string; stepLink: string; page: string; current: string; other: string }> = {
  md: {
    nav: "mt-10 gap-2",
    step: "flex h-10 items-center rounded-xl border border-edge px-3.5 text-sm font-semibold transition-colors",
    stepLink: "bg-surface text-ink hover:border-blue hover:text-blue",
    page: "flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-colors",
    current: "border-blue bg-blue text-on-blue",
    other: "border-edge bg-surface text-ink hover:border-blue hover:text-blue",
  },
  sm: {
    nav: "mt-6 gap-1 sm:gap-2",
    step: "flex items-center gap-1 rounded-[4px] px-1 text-xs font-semibold transition-colors max-sm:min-h-11 sm:h-[25px]",
    stepLink: "text-ink hover:text-blue",
    page: "flex items-center justify-center rounded-[4px] px-1 text-sm font-semibold transition-colors max-sm:min-h-11 max-sm:min-w-11 sm:h-[25px] sm:min-w-[25px]",
    current: "bg-blue text-on-blue",
    other: "text-ink hover:text-blue",
  },
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

// At either end Previous/Next aren't links, so they drop out of the tab order
function StepLink({ href, disabled, size, children }: { href: string; disabled: boolean; size: PaginationSize; children: React.ReactNode }) {
  const className = looks[size].step;
  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} text-slate/50`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${className} ${looks[size].stepLink} ${focusRing}`}>
      {children}
    </Link>
  );
}

/** Previous 1 … 4 [5] 6 … 20 Next, as plain links so it works without JavaScript */
export function Pagination({
  current,
  pages,
  href,
  label,
  size = "md",
}: {
  current: number;
  pages: number;
  href: (page: number) => string;
  /** The nav's accessible name, e.g. "Search result pages" */
  label: string;
  size?: PaginationSize;
}) {
  if (pages <= 1) return null;

  const visible = visiblePages(current, pages);
  const look = looks[size];
  const compact = size === "sm";

  return (
    <nav aria-label={label} className={`flex flex-wrap items-center justify-center ${look.nav}`}>
      <StepLink href={href(Math.max(1, current - 1))} disabled={current === 1} size={size}>
        {compact && <span aria-hidden>&lt;</span>}
        Previous
      </StepLink>

      {visible.map((page, index) => {
        const previous = visible[index - 1];
        return (
          <span key={page} className="contents">
            {previous && page - previous > 1 && <span className={`px-1 ${compact ? "text-ink" : "text-slate"}`}>…</span>}
            <Link
              href={href(page)}
              aria-current={page === current ? "page" : undefined}
              className={`${look.page} ${page === current ? look.current : look.other} ${focusRing}`}
            >
              {page}
            </Link>
          </span>
        );
      })}

      <StepLink href={href(Math.min(pages, current + 1))} disabled={current === pages} size={size}>
        Next
        {compact && <span aria-hidden>&gt;</span>}
      </StepLink>
    </nav>
  );
}
