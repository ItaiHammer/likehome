import Link from "next/link";
import { formatLong } from "@/app/_components/dates";
import { PropertyDot } from "@/app/_components/PropertyDot";
import { ArrowIcon, arrowSlideClass, sectionLinkClass, swipeItemClass, swipeRowClass, tintBox } from "@/app/_components/ui";
import {
  bookedLabel,
  CALENDAR_HINT,
  bookedPercent,
  calendarDays,
  calendarHref,
  calendarProperties,
  calendarStays,
  dayName,
  fullNightNote,
  isFull,
  movementLabel,
  movements,
  roomsAcross,
  roomsBookedLabel,
  stayPlace,
  type CalendarDay,
  type CalendarProperty,
  type CalendarStay,
} from "@/lib/owner-calendar";
import { guestToday } from "@/utils/guest-today";
import { loadOwnerHistory, loadOwnerListings } from "./owner-history";
import { blockFrame, pulse } from "./styles";

const TITLE = "This week";
const TITLE_ID = "owner-week-title";
const DAYS = 7;
const MOVES_SHOWN = 4;

async function loadWeek(ownerId: string) {
  try {
    const [listings, history, today] = await Promise.all([loadOwnerListings(ownerId), loadOwnerHistory(), guestToday()]);
    if (!listings || !history) return null;
    return { properties: calendarProperties(listings), stays: calendarStays(history.bookings), today };
  } catch (error) {
    console.error("This week failed", error);
    return null;
  }
}

function Frame({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <section aria-labelledby={TITLE_ID} aria-busy={busy || undefined} className={`${blockFrame} sm:py-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={TITLE_ID} className="font-serif text-[32px] leading-10 text-ink">
          {TITLE}
        </h2>
        <Link href={calendarHref()} className={sectionLinkClass}>
          Open calendar
          <ArrowIcon className={arrowSlideClass} />
        </Link>
      </div>
      {children}
    </section>
  );
}

// Rooms booked each night for the next seven days, and who comes and goes. Hidden with no listings or a failed read.
export async function OwnerWeek({ ownerId }: { ownerId: string }) {
  const week = await loadWeek(ownerId);
  if (!week || week.properties.length === 0) return null;
  return <WeekCard {...week} />;
}

export function WeekCard({ properties, stays, today }: { properties: CalendarProperty[]; stays: CalendarStay[]; today: string }) {
  const days = calendarDays(today, DAYS, stays, roomsAcross(properties));
  const moves = movements(days);
  const note = fullNightNote(days, today);
  const byId = new Map(properties.map((p) => [p.id, p]));
  const quiet = moves.length === 0 && days.every((d) => d.booked === 0);

  return (
    <Frame>
      <p className="mt-1 text-base text-slate">Rooms booked each night across {properties.length === 1 ? "your place" : "your places"}.</p>
      <ul className={`mt-5 sm:grid sm:grid-cols-7 sm:gap-2.5 ${swipeRowClass()}`}>
        {days.map((d) => (
          <li key={d.date} className={`max-sm:w-[88px] ${swipeItemClass}`}>
            <DayTile day={d} today={today} />
          </li>
        ))}
      </ul>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        {quiet ? (
          <p className="py-2.5 text-[15px] leading-6 text-slate">No guests booked this week.</p>
        ) : moves.length === 0 ? (
          <p className="py-2.5 text-[15px] leading-6 text-slate">Nobody arrives or leaves this week.</p>
        ) : (
          <div>
            <ul className="divide-y divide-edge/60">
              {moves.slice(0, MOVES_SHOWN).map((m) => {
                const property = byId.get(m.stay.hotelId);
                return (
                  <li key={`${m.kind}-${m.stay.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5">
                    <PropertyDot color={property?.color ?? 0} />
                    <span className="w-[6.5rem] shrink-0 text-sm text-slate">{movementLabel(m, today)}</span>
                    <span className="text-[15px] font-semibold text-ink">{m.stay.guest}</span>
                    <span className="min-w-0 text-sm text-slate max-sm:basis-full max-sm:pl-[1.375rem]">{stayPlace(m.stay, property)}</span>
                  </li>
                );
              })}
            </ul>
            {moves.length > MOVES_SHOWN && <p className="pt-1 text-sm leading-5 text-slate">and {moves.length - MOVES_SHOWN} more</p>}
          </div>
        )}
        <div className={`${tintBox} px-[18px] py-4 text-[15px] leading-[22px]`}>
          <p className="font-semibold text-ink">{note?.title ?? "See any day up close"}</p>
          <p className="text-slate">{note?.body ?? CALENDAR_HINT}</p>
        </div>
      </div>
    </Frame>
  );
}

function DayTile({ day, today }: { day: CalendarDay; today: string }) {
  const full = isFull(day);
  return (
    <Link
      href={calendarHref(day.date)}
      aria-label={`${formatLong(day.date)}${day.date === today ? ", today" : ""}: ${roomsBookedLabel(day)}. Open in the calendar`}
      className={`block rounded-lg bg-surface px-2.5 py-3 text-center transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
        day.date === today ? "border-2 border-blue" : "border border-edge"
      }`}
    >
      <span className="block text-[13px] leading-5 text-slate">{dayName(day.date, today)}</span>
      <span className="mt-0.5 block font-serif text-[28px] leading-[34px] text-ink">{Number(day.date.slice(8))}</span>
      <span className={`block text-[13px] font-semibold leading-5 ${full ? "text-danger" : "text-ink"}`}>{bookedLabel(day)}</span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-disabled">
        <span className={`block h-full ${full ? "bg-danger" : "bg-blue"}`} style={{ width: `${bookedPercent(day)}%` }} />
      </span>
    </Link>
  );
}

export function OwnerWeekSkeleton() {
  return (
    <Frame busy>
      <div aria-hidden className={`mt-6 h-36 ${pulse}`} />
    </Frame>
  );
}
