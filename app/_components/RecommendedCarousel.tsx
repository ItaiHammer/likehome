"use client";

import { Children, useEffect, useState, type ReactNode } from "react";

export function RecommendedCarousel({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const tablet = window.matchMedia("(min-width: 640px)");
    const update = () => setPerPage(query.matches ? 3 : tablet.matches ? 2 : 1);
    update();
    query.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);

  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * perPage, (current + 1) * perPage);

  return (
    <div className="mt-6" role="group" aria-label="Recommended stays">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible}
      </ul>
      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-end gap-3" aria-label="Recommended stays pages">
          <button type="button" onClick={() => setPage(Math.max(0, current - 1))} disabled={current === 0} aria-label="Previous stays" className="rounded-control border border-edge bg-surface px-4 py-2 text-ink hover:border-blue disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue">←</button>
          <span className="text-sm text-slate" aria-live="polite">{current + 1} / {pages}</span>
          <button type="button" onClick={() => setPage(Math.min(pages - 1, current + 1))} disabled={current >= pages - 1} aria-label="Next stays" className="rounded-control border border-edge bg-surface px-4 py-2 text-ink hover:border-blue disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue">→</button>
        </nav>
      )}
    </div>
  );
}
