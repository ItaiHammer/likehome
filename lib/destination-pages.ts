/** Stable, non-overlapping destination carousel pages (the last can have fewer tiles). */
export function destinationPageCount(itemCount: number, perPage: number) {
  return Math.max(1, Math.ceil(Math.max(0, itemCount) / Math.max(1, perPage)));
}

export function destinationPageStart(page: number, itemCount: number, perPage: number) {
  const size = Math.max(1, perPage);
  const lastPage = destinationPageCount(itemCount, size) - 1;
  return Math.max(0, Math.min(lastPage, Math.max(0, page))) * size;
}
