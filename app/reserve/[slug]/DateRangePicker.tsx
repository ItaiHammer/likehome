"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatDate } from "../../_components/dates";
import { RangeCalendar, type RangeField } from "../../_components/RangeCalendar";
import { labelClass } from "../../_components/ui";

// Field look shared with inputClass: Edge border, blue border + ring while open, danger on error.
const fieldClass = (active: boolean, error: boolean, filled: boolean) =>
  `flex h-[46px] w-full items-center rounded-control border bg-surface px-4 text-left text-base outline-hidden transition focus-visible:border-blue focus-visible:ring-1 focus-visible:ring-blue ${
    active ? "border-blue ring-1 ring-blue" : error ? "border-danger" : "border-edge"
  } ${filled ? "text-ink" : "text-slate"}`;

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  blockedOffsets,
  open,
  onOpenChange,
  error,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Booked nights, as days from today */
  blockedOffsets: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error?: string;
}) {
  // Which field the calendar is filling. Each field opens it for itself.
  const [field, setField] = useState<RangeField>("in");
  // Bumped whenever a field opens the calendar, so it jumps to that field's month.
  const [session, setSession] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickingOut = field === "out";

  // Closed with focus inside the calendar (Done, Escape): send focus back to
  // the field that opened it
  useLayoutEffect(() => {
    if (!open && panelRef.current?.contains(document.activeElement)) (field === "out" ? outRef : inRef).current?.focus();
  }, [open, field]);

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

  function openField(f: RangeField) {
    if (open && field === f) {
      onOpenChange(false);
      return;
    }
    setField(f);
    setSession((s) => s + 1);
    onOpenChange(true);
  }

  return (
    <div ref={ref} className="relative">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span id="check-in-label" className={labelClass}>
            Check-in
          </span>
          <button
            ref={inRef}
            id="checkIn"
            type="button"
            onClick={() => openField("in")}
            aria-labelledby="check-in-label check-in-value"
            aria-expanded={open && !pickingOut}
            aria-haspopup="dialog"
            aria-describedby={error ? "dates-error" : undefined}
            className={fieldClass(open && !pickingOut, !!error, !!checkIn)}
          >
            <span id="check-in-value">{checkIn ? formatDate(checkIn) : "Add date"}</span>
          </button>
        </div>
        <div>
          <span id="check-out-label" className={labelClass}>
            Check-out
          </span>
          <button
            ref={outRef}
            type="button"
            onClick={() => openField("out")}
            aria-labelledby="check-out-label check-out-value"
            aria-expanded={open && pickingOut}
            aria-haspopup="dialog"
            aria-describedby={error ? "dates-error" : undefined}
            className={fieldClass(open && pickingOut, !!error, !!checkOut)}
          >
            <span id="check-out-value">{checkOut ? formatDate(checkOut) : "Add date"}</span>
          </button>
        </div>
      </div>
      {error && (
        <p id="dates-error" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Choose your dates"
        data-open={open}
        inert={!open}
        className="dropdown absolute -left-3 -right-3 top-full z-30 mt-3 rounded-2xl border border-edge bg-surface p-4 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)]"
      >
        {/* Notch pointing at the field being filled, so the calendar reads as that field's. */}
        <span
          aria-hidden
          style={{ left: pickingOut ? "calc(75% - 3px)" : "calc(25% - 3px)" }}
          className="absolute -top-[7px] h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-edge bg-surface transition-[left] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        />
        <RangeCalendar
          resetKey={session}
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={onChange}
          field={field}
          onFieldChange={setField}
          onDone={() => onOpenChange(false)}
          blockedOffsets={blockedOffsets}
        />
      </div>
    </div>
  );
}
