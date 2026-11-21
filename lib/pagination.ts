// No Next.js imports here so it can be unit tested with `npm test`.

/** Page links to show: first, last and the current one ±1, in order (a jump of more than 1 is a "…" gap) */
export function visiblePages(current: number, pages: number): number[] {
  return Array.from(new Set([1, current - 1, current, current + 1, pages]))
    .filter((page) => page >= 1 && page <= pages)
    .sort((a, b) => a - b)
}
