import { formatDate } from "@/app/_components/dates";
import { PropertyDot } from "@/app/_components/PropertyDot";
import { dayGuests, movementSummary, roomsBookedLabel, stayNote, stayPlace, type CalendarDay, type CalendarProperty, type CalendarStay } from "@/lib/owner-calendar";

/**
 * One night of the owner's bookings: rooms booked, who arrives and leaves, and each guest there. Used by the
 * My Listings calendar and the homepage week card; `action` is the link under the guests (or under the empty line).
 */
export function DayBookings({
  day,
  today,
  byId,
  colorOf,
  action,
  className = "",
}: {
  day: CalendarDay;
  today: string;
  byId: Map<string, CalendarProperty>;
  colorOf: (s: CalendarStay) => number;
  action?: React.ReactNode;
  className?: string;
}) {
  const guests = dayGuests(day);
  return (
    <section aria-label="Selected day" className={`rounded-[10px] border border-edge px-4 pb-1.5 pt-4 ${className}`}>
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
          {guests.map((s) => (
            <li key={s.id} className="flex gap-2.5 border-t border-edge/60 py-3">
              <PropertyDot color={colorOf(s)} className="mt-[5px]" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{s.guest}</p>
                <p className="text-[13px] text-slate">{stayPlace(s, byId.get(s.hotelId))}</p>
                <p className="mt-0.5 text-[13px] text-blue-dark">{stayNote(s, day.date)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {action && <div className="border-t border-edge/60 py-3">{action}</div>}
    </section>
  );
}
