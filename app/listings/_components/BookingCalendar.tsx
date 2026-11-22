"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLong, formatMonth, monthOf, shiftMonth, type Month } from "@/app/_components/dates";
import { DayBookings } from "@/app/_components/DayBookings";
import { PropertyDot } from "@/app/_components/PropertyDot";
import { ArrowIcon, arrowSlideClass, Chip, ChevronIcon, iconButtonClass, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import {
  bookedLabel,
  calendarDay,
  dayGuests,
  forProperty,
  isFull,
  monthGrid,
  roomsAcross,
  roomsBookedLabel,
  type BusyLevel,
  type CalendarDay,
  type CalendarProperty,
  type CalendarStay,
} from "@/lib/owner-calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOTS_SHOWN = 4;

// Busier nights get more of the blue; a full night turns to the danger tint.
// The blue stays at or under 14% so blue-dark text on it clears 4.5:1.
const SHADES: Record<BusyLevel, string> = {
  0: "border-edge/60 bg-surface",
  1: "border-blue/15 bg-[color-mix(in_srgb,var(--blue)_7%,var(--surface))]",
  2: "border-blue/20 bg-[color-mix(in_srgb,var(--blue)_14%,var(--surface))]",
  3: "border-danger/20 bg-[color-mix(in_srgb,var(--danger)_14%,var(--surface))]",
};

const LEGEND: { level: BusyLevel; label: string }[] = [
  { level: 1, label: "Some rooms booked" },
  { level: 2, label: "Busy" },
  { level: 3, label: "Full" },
];

/**
 * The owner's month of bookings: one property or all of them, each night shaded by how busy it is.
 * Picking a day lists who is there. Everything is worked out here from the stays passed in.
 */
export function BookingCalendar({
  properties,
  stays,
  today,
  initialDate,
  initialStay,
}: {
  properties: CalendarProperty[];
  stays: CalendarStay[];
  today: string;
  initialDate: string;
  /** A reservation listed on initialDate to open and highlight (the homepage's guest rows link here) */
  initialStay: string | null;
}) {
  const [month, setMonth] = useState<Month>(() => monthOf(initialDate));
  const [selected, setSelected] = useState(initialDate);
  const [focusStay, setFocusStay] = useState(initialStay);
  const selectDay = (date: string) => {
    setSelected(date);
    setFocusStay(null);
  };
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const shown = forProperty(properties, stays, propertyId);
  const rooms = roomsAcross(shown.properties);
  const cells = monthGrid(month, shown.stays, rooms);
  const day = calendarDay(selected, shown.stays, rooms);
  const byId = new Map(properties.map((p) => [p.id, p]));
  const colorOf = (s: CalendarStay) => byId.get(s.hotelId)?.color ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="calendar-title" className="font-serif text-[32px] leading-10 text-ink">
          Calendar
        </h2>
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className={iconButtonClass("sm")}>
            <ChevronIcon className="h-4 w-4 rotate-90" />
          </button>
          <p aria-live="polite" className="w-[8.5rem] text-center text-base font-semibold text-ink">
            {formatMonth(month)}
          </p>
          <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} className={iconButtonClass("sm")}>
            <ChevronIcon className="h-4 w-4 -rotate-90" />
          </button>
        </div>
      </div>

      {properties.length > 1 && (
        <div role="group" aria-label="Show bookings for" className="mt-3.5 flex flex-wrap gap-2">
          <Chip active={propertyId === null} onClick={() => setPropertyId(null)} className="max-sm:min-h-11">
            All places
          </Chip>
          {properties.map((p) => (
            <Chip key={p.id} active={propertyId === p.id} onClick={() => setPropertyId(p.id)} className="inline-flex items-center gap-[7px] max-sm:min-h-11">
              <PropertyDot color={p.color} size="md" />
              {p.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-[18px] grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-[22px] lg:grid-cols-[minmax(0,1fr)_16.875rem]">
        <div>
          <div aria-hidden className="mb-1.5 grid grid-cols-7 gap-1 text-xs font-semibold text-slate sm:gap-1.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="max-sm:text-center">
                {w}
              </span>
            ))}
          </div>
          <div role="group" aria-label={`Days in ${formatMonth(month)}`} className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((cell, i) =>
              cell ? (
                <DayButton key={cell.date} day={cell} today={today} selected={cell.date === selected} colorOf={colorOf} onSelect={selectDay} />
              ) : (
                <span key={`pad-${i}`} aria-hidden />
              ),
            )}
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-xs text-slate">
            {LEGEND.map((l) => (
              <span key={l.level} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`h-3.5 w-3.5 rounded border ${SHADES[l.level]}`} />
                {l.label}
              </span>
            ))}
            <span>
              <b className="text-blue-dark">+2 in</b> arrivals that day
            </span>
          </div>
        </div>

        <DayBookings
          day={day}
          today={today}
          byId={byId}
          colorOf={colorOf}
          focusStay={focusStay}
          action={
            dayGuests(day).length > 0 && (
              <Link href={PAGE_ROUTES.OWNER_MESSAGES} className={`${sectionLinkClass} text-sm`}>
                Message these guests
                <ArrowIcon className={arrowSlideClass} />
              </Link>
            )
          }
        />
      </div>
    </>
  );
}

function DayButton({
  day,
  today,
  selected,
  colorOf,
  onSelect,
}: {
  day: CalendarDay;
  today: string;
  selected: boolean;
  colorOf: (s: CalendarStay) => number;
  onSelect: (date: string) => void;
}) {
  const isToday = day.date === today;
  const arrivals = day.arrivals.length;
  const label = [formatLong(day.date), isToday && "today", roomsBookedLabel(day), arrivals > 0 && `${arrivals} arriving`].filter(Boolean).join(", ");
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(day.date)}
      className={`flex h-14 min-w-0 flex-col justify-between rounded-lg px-1.5 py-1.5 text-left transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:h-[84px] sm:px-[9px] sm:py-2 ${SHADES[day.level]} ${
        selected ? "border-2 border-blue!" : "border"
      }`}
    >
      <span className="flex items-start justify-between gap-1 text-sm font-semibold text-ink">
        <span className={isToday ? "-ml-1 -mt-0.5 rounded-full bg-blue px-1.5 text-on-blue" : selected ? "font-bold" : ""}>{Number(day.date.slice(8))}</span>
        {arrivals > 0 && (
          <span className="text-xs font-semibold text-blue-dark max-sm:hidden">
            +{arrivals}
            <span className="max-xl:hidden"> in</span>
          </span>
        )}
      </span>
      <span className="flex flex-wrap gap-[3px]">
        {day.staying.slice(0, DOTS_SHOWN).map((s) => (
          <PropertyDot key={s.id} color={colorOf(s)} size="sm" />
        ))}
      </span>
      {/* Danger text on the danger tint falls under 4.5:1 in light mode, so "Full" is ink there */}
      <span className={`truncate text-xs max-sm:hidden ${isFull(day) ? "font-semibold text-ink dark:text-danger" : "text-slate"}`}>
        {day.booked > 0 && (
          <>
            <span className="xl:hidden">{bookedLabel(day, "/")}</span>
            <span className="max-xl:hidden">{bookedLabel(day)}</span>
          </>
        )}
      </span>
    </button>
  );
}
