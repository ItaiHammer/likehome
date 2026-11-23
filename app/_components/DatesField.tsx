"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { browserTimeZone, formatRange, formatShort, nightsBetween } from "./dates";
import { RotatingPlaceholder } from "./placeholders";
import { RangeCalendar, type RangeField } from "./RangeCalendar";

// The search bar's dates segment: one field that opens the same range calendar
// the stay pages use. Sends checkIn / checkOut with the form, plus the browser's
// time zone (tz) so the server judges "today" in the guest's calendar, not UTC.
const noSubscribe = () => () => {};

export function DatesField({
  className = "",
  initialCheckIn = "",
  initialCheckOut = "",
}: {
  className?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}) {
  // Empty during the server render; filled in from the browser after hydration
  const timeZone = useSyncExternalStore(noSubscribe, browserTimeZone, () => "");
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [field, setField] = useState<RangeField>("in");
  // Bumped on each open, so the calendar starts on the month being filled.
  const [session, setSession] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 368 });

  // Keep the calendar visually anchored to the search date field. A portal
  // prevents result-card stacking contexts from sitting above the dropdown.
  const updatePosition = useCallback(() => {
    const anchor = triggerRef.current?.closest('[data-date-anchor]') as HTMLElement | null;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(368, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12));
    const expectedHeight = 450;
    const top = rect.bottom + 12 + expectedHeight > window.innerHeight && rect.top > expectedHeight
      ? Math.max(12, rect.top - expectedHeight - 12) : rect.bottom + 12;
    setPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  // Done and Escape send focus back to the field (if it was in the calendar).
  // An outside click just closes, leaving focus where the click put it.
  const restoreFocus = () => {
    if (panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
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
    updatePosition();
    setOpen(true);
  }

  const nights = nightsBetween(checkIn, checkOut);
  const label =
    checkIn && checkOut
      ? `${formatRange(checkIn, checkOut)} · ${nights} ${nights === 1 ? "night" : "nights"}`
      : checkIn
        ? `${formatShort(checkIn)} - Add check-out`
        : "";

  return (
    <div ref={ref} data-date-anchor className={`relative ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" strokeLinecap="round" />
      </svg>
      <button
        ref={triggerRef}
        type="button"
        data-trigger
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label ? `Dates: ${label}` : "Dates"}
        // after: covers the whole segment, padding included, so a click anywhere in it opens the calendar
        className={`min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 focus-visible:outline-hidden ${label ? "text-ink" : "text-slate"}`}
      >
        {checkIn && checkOut ? (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base">{formatRange(checkIn, checkOut)}</span>
            <span className="mt-1 text-xs font-medium text-slate">
              {nights} {nights === 1 ? "night" : "nights"}
            </span>
          </span>
        ) : (
          label || <RotatingPlaceholder kind="when" paused={open} />
        )}
      </button>

      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="tz" value={timeZone} />

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999]"
          // The transparent layer receives clicks instead of any listing cards
          // behind the dropdown. No screen-dimming or centered modal.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose your dates"
            style={{ position: "fixed", top: position.top, left: position.left, width: position.width, maxHeight: "calc(100dvh - 24px)" }}
            className="overflow-y-auto rounded-2xl border border-edge bg-surface p-4 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <RangeCalendar
              resetKey={session}
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }}
              field={field}
              onFieldChange={setField}
              onDone={() => { restoreFocus(); setOpen(false); }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
