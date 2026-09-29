"use client";

import { useEffect, useRef, useState } from "react";

const rows = [
  { key: "adults", label: "Adults", hint: "Ages 13 or above", min: 1, max: 16 },
  { key: "children", label: "Children", hint: "Ages 0 to 12", min: 0, max: 10 },
] as const;

type Counts = Record<(typeof rows)[number]["key"], number>;

// Themed replacement for a native <select>, whose popup ignores the site's light/dark theme.
export function GuestsPicker({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ adults: 2, children: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const total = counts.adults + counts.children;
  const step = (key: keyof Counts, delta: number) =>
    setCounts((c) => ({ ...c, [key]: c[key] + delta }));

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
      </svg>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full min-w-0 items-center justify-between gap-2 text-left text-base text-ink outline-none"
      >
        <span className="truncate">
          {total} {total === 1 ? "guest" : "guests"}
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} fill="currentColor" aria-hidden>
          <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <input type="hidden" name="adults" value={counts.adults} />
      <input type="hidden" name="children" value={counts.children} />

      <div
        role="dialog"
        aria-label="Choose guests"
        data-open={open}
        inert={!open}
        className="dropdown absolute right-0 left-0 top-full z-30 mt-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)] md:left-auto md:w-80"
      >
        {rows.map((r, i) => (
          <div
            key={r.key}
            className="cascade flex items-center justify-between py-3 first:pt-1"
            style={{ "--i": i } as React.CSSProperties}
          >
            <div>
              <p className="text-sm font-semibold text-ink">{r.label}</p>
              <p className="text-xs text-muted">{r.hint}</p>
            </div>
            <div className="flex items-center gap-3">
              <StepButton label={`Fewer ${r.label.toLowerCase()}`} disabled={counts[r.key] <= r.min} onClick={() => step(r.key, -1)}>
                <path d="M5 10h10" />
              </StepButton>
              <span className="w-5 text-center text-sm font-semibold text-ink tabular-nums" aria-live="polite">
                {counts[r.key]}
              </span>
              <StepButton label={`More ${r.label.toLowerCase()}`} disabled={counts[r.key] >= r.max} onClick={() => step(r.key, 1)}>
                <path d="M5 10h10M10 5v10" />
              </StepButton>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cascade mt-2 h-[46px] w-full rounded-control bg-brand text-base font-semibold text-white hover:bg-brand-dark"
          style={{ "--i": rows.length } as React.CSSProperties}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-control border border-line text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
