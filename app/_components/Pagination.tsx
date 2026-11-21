import Link from "next/link";
import { visiblePages } from "@/lib/pagination";

// At either end Previous/Next aren't links, so they drop out of the tab order
function StepLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const className = "flex h-10 items-center rounded-xl border border-edge px-3.5 text-sm font-semibold transition-colors";
  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} text-slate/50`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${className} bg-surface text-ink hover:border-blue hover:text-blue`}>
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
}: {
  current: number;
  pages: number;
  href: (page: number) => string;
  /** The nav's accessible name, e.g. "Search result pages" */
  label: string;
}) {
  if (pages <= 1) return null;

  const visible = visiblePages(current, pages);

  return (
    <nav aria-label={label} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <StepLink href={href(Math.max(1, current - 1))} disabled={current === 1}>
        Previous
      </StepLink>

      {visible.map((page, index) => {
        const previous = visible[index - 1];
        return (
          <span key={page} className="contents">
            {previous && page - previous > 1 && <span className="px-1 text-slate">…</span>}
            <Link
              href={href(page)}
              aria-current={page === current ? "page" : undefined}
              className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-colors ${
                page === current
                  ? "border-blue bg-blue text-on-blue"
                  : "border-edge bg-surface text-ink hover:border-blue hover:text-blue"
              }`}
            >
              {page}
            </Link>
          </span>
        );
      })}

      <StepLink href={href(Math.min(pages, current + 1))} disabled={current === pages}>
        Next
      </StepLink>
    </nav>
  );
}
