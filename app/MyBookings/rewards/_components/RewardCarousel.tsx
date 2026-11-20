"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { iconButtonClass } from "@/app/_components/ui";

/** A scrollable row of reward cards with ‹ n / total › arrows (the arrows only show when it overflows) */
export function RewardCarousel({ label, children }: { label: string; children: React.ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [view, setView] = useState({ lastShown: 0, atStart: true, atEnd: true });
  const count = Children.count(children);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const right = track.scrollLeft + track.clientWidth;
    const items = Array.from(track.children) as HTMLElement[];
    setView({
      lastShown: items.filter((item) => item.offsetLeft + item.offsetWidth <= right + 1).length,
      atStart: track.scrollLeft <= 1,
      atEnd: right >= track.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Fires once right away, then on every resize
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    track.scrollBy({ left: direction * (card.offsetWidth + 12), behavior: "smooth" });
  }

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label}>
      <ul ref={trackRef} onScroll={measure} className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {Children.map(children, (child) => (
          <li className="w-[180px] shrink-0 snap-start">{child}</li>
        ))}
      </ul>
      {!(view.atStart && view.atEnd) && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-slate">
          <button
            type="button"
            aria-label="Previous rewards"
            aria-disabled={view.atStart}
            onClick={() => !view.atStart && scroll(-1)}
            className={iconButtonClass("sm")}
          >
            <span aria-hidden>‹</span>
          </button>
          <span aria-live="polite">
            {view.lastShown} / {count}
          </span>
          <button
            type="button"
            aria-label="Next rewards"
            aria-disabled={view.atEnd}
            onClick={() => !view.atEnd && scroll(1)}
            className={iconButtonClass("sm")}
          >
            <span aria-hidden>›</span>
          </button>
        </div>
      )}
    </div>
  );
}
