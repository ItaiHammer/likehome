// No Next.js imports here so it can be unit tested with `npm test`.

/** Page links to show: first, last and the current one ±1, in order (a jump of more than 1 is a "…" gap) */
export function visiblePages(current: number, pages: number): number[] {
  return Array.from(new Set([1, current - 1, current, current + 1, pages]))
    .filter((page) => page >= 1 && page <= pages)
    .sort((a, b) => a - b)
}

/** A ?page= search param as a page number, 1 when missing or not a plain positive number */
export function pageParam(param: string | string[] | undefined): number {
  const page = typeof param === 'string' && /^\d{1,6}$/.test(param) ? Number(param) : 1
  return page >= 1 ? page : 1
}

export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / size))

/** One page of an in-memory list; a page past the end shows the last one */
export function pageSlice<T>(items: T[], page: number, size: number): { items: T[]; page: number; pages: number } {
  const pages = pageCount(items.length, size)
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  const from = (current - 1) * size
  return { items: items.slice(from, from + size), page: current, pages }
}
