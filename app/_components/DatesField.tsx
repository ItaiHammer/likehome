"use client";

import { useEffect, useRef, useState } from "react";
import { formatShort, nightsBetween } from "./dates";
import { RotatingPlaceholder } from "./placeholders";
import { RangeCalendar, type RangeField } from "./RangeCalendar";

// The search bar's dates segment: one field that opens the same range calendar
// the stay pages use. Sends checkIn / checkOut with the form.
export function DatesField({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [field, setField] = useState<RangeField>("in");
  // Bumped on each open, so the calendar starts on the month being filled.
  const [session, setSession] = useState(0);
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

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    // Pick up where they left off: a lone check-in still needs its check-out.
    setField(checkIn && !checkOut ? "out" : "in");
    setSession((s) => s + 1);
    setOpen(true);
  }

  const nights = nightsBetween(checkIn, checkOut);
  const label =
    checkIn && checkOut
      ? `${formatShort(checkIn)} – ${formatShort(checkOut)} · ${nights} ${nights === 1 ? "night" : "nights"}`
      : checkIn
        ? `${formatShort(checkIn)} – Add check-out`
        : "";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" strokeLinecap="round" />
      </svg>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label ? `Dates: ${label}` : "Dates"}
        className={`min-w-0 flex-1 truncate text-left text-base outline-none ${label ? "text-ink" : "text-muted"}`}
      >
        {label || <RotatingPlaceholder kind="when" paused={open} />}
      </button>

      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />

      <div
        role="dialog"
        aria-label="Choose your dates"
        data-open={open}
        inert={!open}
        className="dropdown absolute left-0 right-0 top-full z-30 mt-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)] md:right-auto md:w-[23rem]"
      >
        <RangeCalendar
          resetKey={session}
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(a, b) => {
            setCheckIn(a);
            setCheckOut(b);
          }}
          field={field}
          onFieldChange={setField}
          onDone={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
