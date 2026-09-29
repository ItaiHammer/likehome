"use client";

import { useEffect, useRef } from "react";
import { buttonPrimary, iconButton, labelClass } from "../../_components/ui";

const ROWS = [
  { key: "adults", label: "Adults", hint: "Ages 13 or above", min: 1, max: 16 },
  { key: "children", label: "Children", hint: "Ages 0 to 12", min: 0, max: 10 },
] as const;

export function guestLabel(adults: number, children: number) {
  const parts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];
  if (children) parts.push(`${children} ${children === 1 ? "child" : "children"}`);
  return parts.join(", ");
}

// Controlled guest counter for the reservation card (the search bar keeps its own GuestsPicker).
export function GuestsField({
  adults,
  childCount,
  onChange,
  open,
  onOpenChange,
  sleeps,
  error,
}: {
  adults: number;
  childCount: number;
  onChange: (adults: number, children: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many the selected room sleeps */
  sleeps: number;
  error?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const counts = { adults, children: childCount };
  const set = (key: (typeof ROWS)[number]["key"], value: number) =>
    key === "adults" ? onChange(value, childCount) : onChange(adults, value);

  return (
    <div ref={ref} className="relative">
      <span id="guests-label" className={labelClass}>
        Guests
      </span>
      <button
        id="guests"
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-labelledby="guests-label guests-value"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-describedby={error ? "guests-error" : undefined}
        className={`flex h-[46px] w-full items-center justify-between rounded-control border bg-surface px-4 text-left text-base text-ink outline-none transition focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand ${
          open ? "border-brand ring-1 ring-brand" : error ? "border-danger" : "border-line"
        }`}
      >
        <span id="guests-value">{guestLabel(adults, childCount)}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} fill="none" aria-hidden>
          <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {error && (
        <p id="guests-error" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div
        role="dialog"
        aria-label="Choose guests"
        data-open={open}
        inert={!open}
        className="dropdown absolute -left-3 -right-3 top-full z-30 mt-2 rounded-2xl border border-line bg-surface px-4 pb-4 pt-1 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)]"
      >
        {ROWS.map((r, i) => (
          <div key={r.key} className="cascade flex items-center justify-between border-b border-line py-3" style={{ "--i": i } as React.CSSProperties}>
            <div>
              <p className="text-base font-semibold leading-5 text-ink">{r.label}</p>
              <p className="text-sm text-muted">{r.hint}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Fewer ${r.label.toLowerCase()}`}
                disabled={counts[r.key] <= r.min}
                onClick={() => set(r.key, counts[r.key] - 1)}
                className={iconButton}
              >
                <StepIcon d="M5 10h10" />
              </button>
              <span className="w-5 text-center text-base font-semibold tabular-nums text-ink" aria-live="polite">
                {counts[r.key]}
              </span>
              <button
                type="button"
                aria-label={`More ${r.label.toLowerCase()}`}
                disabled={counts[r.key] >= r.max}
                onClick={() => set(r.key, counts[r.key] + 1)}
                className={iconButton}
              >
                <StepIcon d="M5 10h10M10 5v10" />
              </button>
            </div>
          </div>
        ))}
        <div className="cascade pt-3" style={{ "--i": ROWS.length } as React.CSSProperties}>
          <p className="text-sm text-muted">This room sleeps up to {sleeps}.</p>
          <button type="button" onClick={() => onOpenChange(false)} className={`${buttonPrimary} mt-3 w-full`}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
