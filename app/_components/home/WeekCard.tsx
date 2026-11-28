"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLong, formatShort } from "@/app/_components/dates";
import { DayBookings } from "@/app/_components/DayBookings";
import { ArrowIcon, arrowSlideClass, sectionLinkClass, swipeItemClass, swipeRowClass } from "@/app/_components/ui";
import {
  bookedLabel,
  bookedPercent,
  calendarDays,
  calendarHref,
  dayName,
  isFull,
  reservationsLabel,
  roomsAcross,
  roomsBookedLabel,
  type CalendarDay,
  type CalendarProperty,
  type CalendarStay,
} from "@/lib/owner-calendar";

const DAYS = 7;
const GUESTS_LISTED = 4;

// The next seven nights; picking one shows its guests, with a link to that date in the full calendar
export function WeekCard({ properties, stays, today }: { properties: CalendarProperty[]; stays: CalendarStay[]; today: string }) {
  const [selected, setSelected] = useState(today);
  const days = calendarDays(today, DAYS, stays, roomsAcross(properties));
  const day = days.find((d) => d.date === selected) ?? days[0];
  const byId = new Map(properties.map((p) => [p.id, p]));

  return (
    <>
      <p className="mt-1 text-base text-slate">Rooms booked each night across {properties.length === 1 ? "your place" : "your places"}.</p>
      <ul aria-label="Pick a day" className={`mt-5 sm:grid sm:grid-cols-7 sm:gap-2.5 ${swipeRowClass()}`}>
        {days.map((d) => (
          <li key={d.date} className={`max-sm:w-[88px] ${swipeItemClass}`}>
            <DayTile day={d} today={today} selected={d.date === day.date} onSelect={setSelected} />
          </li>
        ))}
      </ul>
      <DayBookings
        day={day}
        today={today}
        byId={byId}
        colorOf={(s) => byId.get(s.hotelId)?.color ?? 0}
        className="mt-5"
        limit={GUESTS_LISTED}
        guestHref={(s) => calendarHref(day.date, s.id)}
        action={
          <Link href={calendarHref(day.date)} className={`${sectionLinkClass} text-sm`}>
            {reservationsLabel(day)} · Open {formatShort(day.date)} in the calendar
            <ArrowIcon className={arrowSlideClass} />
          </Link>
        }
      />
    </>
  );
}

function DayTile({ day, today, selected, onSelect }: { day: CalendarDay; today: string; selected: boolean; onSelect: (date: string) => void }) {
  const full = isFull(day);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${formatLong(day.date)}${day.date === today ? ", today" : ""}: ${roomsBookedLabel(day)}`}
      onClick={() => onSelect(day.date)}
      className={`block w-full rounded-lg bg-surface px-2.5 py-3 text-center transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
        selected ? "border-2 border-blue" : "border border-edge"
      }`}
    >
      <span className="block text-[13px] leading-5 text-slate">{dayName(day.date, today)}</span>
      <span className="mt-0.5 block font-serif text-[28px] leading-[34px] text-ink">{Number(day.date.slice(8))}</span>
      <span className={`block text-[13px] font-semibold leading-5 ${full ? "text-danger" : "text-ink"}`}>{bookedLabel(day)}</span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-disabled">
        <span className={`block h-full ${full ? "bg-danger" : "bg-blue"}`} style={{ width: `${bookedPercent(day)}%` }} />
      </span>
    </button>
  );
}
