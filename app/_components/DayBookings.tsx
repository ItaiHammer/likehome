import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { formatDate } from "@/app/_components/dates";
import { PropertyDot } from "@/app/_components/PropertyDot";
import { ArrowIcon, ChevronIcon, arrowSlideClass, tintBox } from "@/app/_components/ui";
import { plural } from "@/lib/listing-display";
import { dayGuests, movementSummary, roomsBookedLabel, stayDetails, stayNote, stayPlace, type CalendarDay, type CalendarProperty, type CalendarStay } from "@/lib/owner-calendar";

const rowClass =
  "group flex gap-2.5 rounded-lg px-2 py-3 text-left transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue dark:hover:bg-white/10";
const focusedClass = `${tintBox} my-1.5`;

/**
 * One night of the owner's bookings: rooms booked, who arrives and leaves, and each guest there. Used by the
 * My Listings calendar and the homepage week card; `action` is the link under the guests (or under the empty line).
 * With `guestHref` each guest links there; without it each guest opens its reservation details in place.
 * `limit` caps the guests listed; `focusStay` starts that guest open, highlighted and scrolled into view.
 * Client only: render it from a client component.
 */
export function DayBookings({
  day,
  today,
  byId,
  colorOf,
  action,
  guestHref,
  limit,
  focusStay,
  className = "",
}: {
  day: CalendarDay;
  today: string;
  byId: Map<string, CalendarProperty>;
  colorOf: (s: CalendarStay) => number;
  action?: React.ReactNode;
  guestHref?: (s: CalendarStay) => string;
  limit?: number;
  focusStay?: string | null;
  className?: string;
}) {
  const guests = dayGuests(day);
  const shown = limit === undefined ? guests : guests.slice(0, limit);
  const more = guests.length - shown.length;
  // Open rows belong to one day, so picking another day starts with every row closed
  const [open, setOpen] = useState(() => ({ date: day.date, ids: focusStay ? [focusStay] : [] }));
  if (open.date !== day.date) setOpen({ date: day.date, ids: [] });
  const openIds = open.date === day.date ? open.ids : [];
  const toggle = (id: string) =>
    setOpen({ date: day.date, ids: openIds.includes(id) ? openIds.filter((x) => x !== id) : [...openIds, id] });

  const focusRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <section aria-label="Selected day" className={`min-w-0 rounded-[10px] border border-edge px-4 pb-1.5 pt-4 ${className}`}>
      <div aria-live="polite">
        <p className="text-[13px] font-semibold text-blue-dark">
          {formatDate(day.date)}
          {day.date === today && " · Today"}
        </p>
        <p className="mb-1 mt-0.5 font-serif text-2xl leading-[30px] text-ink">{roomsBookedLabel(day)}</p>
        <p className="mb-1.5 text-[13px] text-slate">{movementSummary(day)}</p>
      </div>
      {guests.length === 0 ? (
        <p className="border-t border-edge/60 py-3 text-sm text-slate">Nobody is staying this night.</p>
      ) : (
        <ul>
          {shown.map((s) => {
            const focused = s.id === focusStay;
            return (
              <li key={s.id} ref={focused ? focusRef : undefined} className="scroll-mt-6 border-t border-edge/60">
                <GuestRow
                  stay={s}
                  date={day.date}
                  place={stayPlace(s, byId.get(s.hotelId))}
                  color={colorOf(s)}
                  href={guestHref?.(s)}
                  open={openIds.includes(s.id)}
                  onToggle={() => toggle(s.id)}
                  focused={focused}
                />
              </li>
            );
          })}
          {more > 0 && <li className="border-t border-edge/60 py-2.5 text-[13px] text-slate">+{plural(more, "more reservation")}</li>}
        </ul>
      )}
      {action && <div className="border-t border-edge/60 py-3">{action}</div>}
    </section>
  );
}

function GuestRow({
  stay,
  date,
  place,
  color,
  href,
  open,
  onToggle,
  focused,
}: {
  stay: CalendarStay;
  date: string;
  place: string;
  color: number;
  href?: string;
  open: boolean;
  onToggle: () => void;
  focused: boolean;
}) {
  const detailsId = useId();
  const summary = (
    <>
      <PropertyDot color={color} className="mt-[5px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{stay.guest}</span>
        <span className="block truncate text-[13px] text-slate">{place}</span>
        <span className="mt-0.5 block text-[13px] text-blue-dark">{stayNote(stay, date)}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${rowClass} -mx-2 w-[calc(100%+1rem)] items-start`}>
        {summary}
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-blue group-hover:text-blue-dark">
          View booking
          <ArrowIcon className={arrowSlideClass} />
        </span>
      </Link>
    );
  }

  return (
    <div className={`-mx-2 ${focused ? focusedClass : "rounded-lg"}`}>
      <button type="button" aria-expanded={open} aria-controls={detailsId} onClick={onToggle} className={`${rowClass} w-full items-start`}>
        {summary}
        <ChevronIcon className={`mt-0.5 h-4 w-4 shrink-0 text-slate transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <dl id={detailsId} hidden={!open} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-2 pb-3 pl-[26px] text-[13px]">
        {stayDetails(stay).map((d) => (
          <div key={d.label} className="contents">
            <dt className="text-slate">{d.label}</dt>
            <dd className="min-w-0 break-words text-ink">{d.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
