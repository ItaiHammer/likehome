"use client";

import { setMotionReduced, useReducedMotion } from "./motion";

// Sits beside ThemeToggle: a labeled button with a small switch, so it reads as a
// setting rather than a mystery icon. On phones the label gives way to an icon.
export function MotionToggle() {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={reduced}
      aria-label="Reduce motion"
      onClick={() => setMotionReduced(!reduced)}
      className="group flex h-9 items-center gap-2 rounded-control border border-line px-2.5 text-sm font-medium text-muted transition-colors hover:border-brand/50 hover:text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand aria-checked:text-ink sm:pl-3.5"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <circle cx="15" cy="12" r="5" />
        <path d="M3 8.5h4M2 12h5M3 15.5h4" />
      </svg>
      <span className="hidden sm:inline">Reduce motion</span>
      {/* Switch: the knob slides right and the track fills blue when on */}
      <span aria-hidden className="relative h-4 w-7 shrink-0 rounded-full bg-line transition-colors group-aria-checked:bg-brand">
        <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-[0_1px_2px_rgba(7,13,47,0.3)] transition-transform group-aria-checked:translate-x-3" />
      </span>
    </button>
  );
}
