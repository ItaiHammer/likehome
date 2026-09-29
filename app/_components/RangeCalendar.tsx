"use client";

import { useState, useSyncExternalStore } from "react";
import { addDays, formatLong, formatShort, nightsBetween, todayISO } from "./dates";
import { buttonPrimary, buttonSecondary, iconButton } from "./ui";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ARROW_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const NO_BLOCKED: number[] = [];

type Month = { y: number; m: number };
const monthOf = (iso: string): Month => {
  const [y, m] = iso.split("-").map(Number);
  return { y, m: m - 1 };
};
const shiftMonth = ({ y, m }: Month, delta: number): Month => {
  const t = y * 12 + m + delta;
  return { y: Math.floor(t / 12), m: t % 12 };
};
const isoOf = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const noSubscribe = () => () => {};

export type RangeField = "in" | "out";

/*
 * The inside of a check-in/check-out calendar popover: month header, day grid,
 * hint, Clear and Done, as `.cascade` rows for the dropdown's staggered
 * entrance. `field` says which end the next pick fills; the parent owns it so
 * its own fields can highlight to match. Change `resetKey` on open to jump
 * back to the month of the field being filled. (Not a remount: rows that
 * mount already open can't cascade in.)
 */
export function RangeCalendar({
  checkIn,
  checkOut,
  onChange,
  field,
  onFieldChange,
  onDone,
  resetKey,
  blockedOffsets = NO_BLOCKED,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  field: RangeField;
  onFieldChange: (field: RangeField) => void;
  onDone: () => void;
  resetKey: number;
  /** Booked nights, as days from today */
  blockedOffsets?: number[];
}) {
  // Empty during the static render, so the page never bakes in a build-time "today".
  const today = useSyncExternalStore(noSubscribe, todayISO, () => "");
  const [view, setView] = useState<Month | null>(null);
  const [hover, setHover] = useState("");
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [seenReset, setSeenReset] = useState(resetKey);
  if (resetKey !== seenReset) {
    setSeenReset(resetKey);
    setView(null);
    setHover("");
    setNotice(null);
  }

  const booked = new Set(today ? blockedOffsets.map((o) => addDays(today, o)) : []);
  const pickingOut = field === "out";
  const nights = nightsBetween(checkIn, checkOut);
  const firstMonth = today ? monthOf(today) : null;
  const anchor = pickingOut ? checkOut || checkIn : checkIn;
  const shown = view ?? (anchor ? monthOf(anchor) : firstMonth);
  const atFirstMonth = !!shown && !!firstMonth && shown.y * 12 + shown.m <= firstMonth.y * 12 + firstMonth.m;
  const crossesBooked = (from: string, to: string) => [...booked].some((b) => b >= from && b < to);
  const rangeEnd = checkOut || (pickingOut && !!checkIn && hover > checkIn && !crossesBooked(checkIn, hover) ? hover : "");

  function pick(day: string) {
    setNotice(null);
    if (!pickingOut) {
      // Keep an existing check-out if the new check-in still fits before it.
      const keepOut = !!checkOut && day < checkOut && !crossesBooked(day, checkOut);
      onChange(day, keepOut ? checkOut : "");
      if (!keepOut) onFieldChange("out");
      return;
    }
    if (!checkIn) {
      onChange("", day);
      onFieldChange("in");
      return;
    }
    if (day <= checkIn) {
      onChange(day, "");
      return;
    }
    if (crossesBooked(checkIn, day)) {
      // A stay can't span a booked night. Keep the length they asked for and
      // move it to the first dates after their check-in where it fits.
      const nights = nightsBetween(checkIn, day);
      const firstBooked = [...booked].filter((b) => b >= checkIn && b < day).sort()[0];
      const start = findOpenStart(addDays(checkIn, 1), nights);
      if (!start) {
        setNotice({ tone: "error", text: "Those dates include a night that’s already booked. Try a shorter stay or other dates." });
        return;
      }
      const end = addDays(start, nights);
      onChange(start, end);
      setView(monthOf(start));
      setNotice({
        tone: "info",
        text: `${formatShort(firstBooked)} is already booked, so we moved your ${nights}-night stay to the next dates that fit: ${formatShort(start)} – ${formatShort(end)}.`,
      });
      return;
    }
    onChange(checkIn, day);
  }

  // Earliest check-in on or after `from` whose `nights` are all free, looking up to a year ahead.
  function findOpenStart(from: string, nights: number) {
    for (let i = 0, start = from; i < 365; i++, start = addDays(start, 1)) {
      if (!crossesBooked(start, addDays(start, nights))) return start;
    }
    return "";
  }

  function onGridKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEPS[e.key];
    const from = (e.target as HTMLElement).dataset.date;
    if (!step || !from) return;
    e.preventDefault();
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-date="${addDays(from, step)}"]:not(:disabled)`)?.focus();
  }

  const cells: (string | null)[] = [];
  if (shown) {
    const lead = new Date(Date.UTC(shown.y, shown.m, 1)).getUTCDay();
    const count = new Date(Date.UTC(shown.y, shown.m + 1, 0)).getUTCDate();
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= count; d++) cells.push(isoOf(shown.y, shown.m, d));
  }
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const cascadeAt = (i: number) => ({ "--i": i }) as React.CSSProperties;

  const hint =
    checkIn && checkOut
      ? `${formatShort(checkIn)} – ${formatShort(checkOut)} · ${nights} ${nights === 1 ? "night" : "nights"}`
      : pickingOut
        ? checkIn
          ? "Now pick your check-out date."
          : "Pick your check-out date."
        : checkOut
          ? "Now pick your check-in date."
          : "Pick your check-in date.";

  return (
    <>
      <div className="cascade flex items-center justify-between" style={cascadeAt(0)}>
        <button
          type="button"
          aria-label="Previous month"
          disabled={atFirstMonth}
          onClick={() => shown && setView(shiftMonth(shown, -1))}
          className={iconButton}
        >
          <Chevron d="M15 6l-6 6 6 6" />
        </button>
        <p className="text-base font-semibold text-ink" aria-live="polite">
          {shown ? `${MONTHS[shown.m]} ${shown.y}` : ""}
        </p>
        <button type="button" aria-label="Next month" disabled={!shown} onClick={() => shown && setView(shiftMonth(shown, 1))} className={iconButton}>
          <Chevron d="M9 6l6 6-6 6" />
        </button>
      </div>

      <div className="cascade mt-3 grid grid-cols-7 text-center text-sm text-slate" style={cascadeAt(1)} aria-hidden>
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div onKeyDown={onGridKey} onPointerLeave={() => setHover("")} className="mt-1 flex flex-col gap-y-1">
        {weeks.map((week, w) => (
          <div key={w} className="cascade grid grid-cols-7" style={cascadeAt(2 + w)}>
            {week.map((day, i) => {
              if (!day) return <span key={`pad-${i}`} aria-hidden />;
              // Check-out needs at least one night before it.
              const past = day < today || (pickingOut && !checkIn && day <= today);
              const isBooked = booked.has(day);
              // A booked night can still be a check-out morning.
              const disabled = past || (isBooked && !(pickingOut && day > checkIn));
              const isStart = day === checkIn;
              const isEnd = day === checkOut;
              const inRange = !!checkIn && !!rangeEnd && day > checkIn && day < rangeEnd;
              const isPreviewEnd = !checkOut && !!rangeEnd && day === rangeEnd;
    
              // Selected ends use the action color; nights in between use Edge, like the logo block.
              let tone: string;
              if (isStart || isEnd)
                tone = `border-blue bg-blue font-semibold text-white ${isStart && rangeEnd ? "rounded-l-control" : isEnd ? "rounded-r-control" : "rounded-control"}`;
              else if (inRange) tone = "border-edge bg-edge text-ink";
              else if (isPreviewEnd) tone = "rounded-r-control border-blue bg-edge text-ink";
              else if (disabled) tone = "cursor-not-allowed rounded-control border-transparent text-slate";
              else tone = `rounded-control text-ink hover:border-blue ${day === today ? "border-edge" : "border-transparent"}`;
    
              return (
                <button
                  key={day}
                  type="button"
                  data-date={day}
                  disabled={disabled}
                  onClick={() => pick(day)}
                  onPointerEnter={() => setHover(day)}
                  aria-pressed={isStart || isEnd}
                  aria-label={`${formatLong(day)}${isBooked ? ", booked" : ""}${isStart ? ", check-in" : ""}${isEnd ? ", check-out" : ""}`}
                  className={`relative h-[46px] border text-base tabular-nums transition-colors outline-none focus-visible:z-10 focus-visible:border-blue focus-visible:ring-1 focus-visible:ring-blue ${tone} ${
                    isBooked ? "line-through" : ""
                  }`}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {notice?.tone === "error" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {notice.text}
        </p>
      )}
      {/* Moved dates are good news, not an error: plain text with an info mark */}
      {notice?.tone === "info" && (
        <p role="status" className="mt-3 flex gap-2 text-sm text-ink">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-blue" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 7.5v.5" strokeLinecap="round" />
          </svg>
          {notice.text}
        </p>
      )}

      <div className="cascade mt-3 border-t border-edge pt-3" style={cascadeAt(2 + weeks.length)}>
        <p className="text-sm text-ink" aria-live="polite">
          {hint}
        </p>
        {blockedOffsets.length > 0 && <p className="text-sm text-slate">Struck-through dates are already booked.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onChange("", "");
              setNotice(null);
              onFieldChange("in");
            }}
            className={buttonSecondary}
          >
            Clear
          </button>
          <button type="button" onClick={onDone} className={buttonPrimary}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
