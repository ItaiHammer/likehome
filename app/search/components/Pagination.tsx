import Link from "next/link";

type RawParams = Record<string, string | string[] | undefined>;

function pageHref(params: RawParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === "page" || raw === undefined || raw === "") continue;
    const values = Array.isArray(raw) ? raw : [raw];
    values.forEach((value) => query.append(key, value));
  }
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `/search?${suffix}` : "/search";
}

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

export function Pagination({
  currentPage,
  totalPages,
  params,
}: {
  currentPage: number;
  totalPages: number;
  params: RawParams;
}) {
  if (totalPages <= 1) return null;

  const visible = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]))
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav aria-label="Search result pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <StepLink href={pageHref(params, Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
        Previous
      </StepLink>

      {visible.map((page, index) => {
        const previous = visible[index - 1];
        return (
          <span key={page} className="contents">
            {previous && page - previous > 1 && <span className="px-1 text-slate">…</span>}
            <Link
              href={pageHref(params, page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-colors ${
                page === currentPage
                  ? "border-blue bg-blue text-on-blue"
                  : "border-edge bg-surface text-ink hover:border-blue hover:text-blue"
              }`}
            >
              {page}
            </Link>
          </span>
        );
      })}

      <StepLink href={pageHref(params, Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
        Next
      </StepLink>
    </nav>
  );
}
