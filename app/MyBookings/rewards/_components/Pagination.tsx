import Link from "next/link";
import { pageList } from "@/lib/rewards";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

/** "‹ Previous 1 … 4 [5] 6 … 20 Next ›" as plain links, so it works without JavaScript */
export function Pagination({ current, pages, href }: { current: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const step = (page: number, label: string) =>
    page >= 1 && page <= pages ? (
      <Link href={href(page)} className={`rounded-control px-1 text-ink hover:text-blue-dark ${focusRing}`}>
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className="px-1 text-slate">
        {label}
      </span>
    );

  return (
    <nav aria-label="Activity pages" className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-semibold">
      {step(current - 1, "‹ Previous")}
      <ol className="flex items-center gap-2">
        {pageList(current, pages).map((page, i) =>
          page === null ? (
            <li key={`gap-${i}`} aria-hidden className="text-ink">
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                href={href(page)}
                aria-current={page === current ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={`flex h-[25px] min-w-[25px] items-center justify-center rounded px-1 ${focusRing} ${page === current ? "bg-blue text-on-blue" : "text-ink hover:text-blue-dark"}`}
              >
                {page}
              </Link>
            </li>
          ),
        )}
      </ol>
      {step(current + 1, "Next ›")}
    </nav>
  );
}
