import { loadOwnerHistory } from "@/app/_components/home/owner-history";
import { pulse } from "@/app/_components/home/styles";
import { Card } from "@/app/_components/ui";
import { calendarProperties, calendarStayParam, calendarStays } from "@/lib/owner-calendar";
import type { Listing } from "@/types/listing";
import { BookingCalendar } from "./BookingCalendar";

const frame = "px-5 py-5 sm:px-[26px] sm:py-6";

// My Listings' calendar card. Sample listings have no bookings, so their calendar is empty.
export async function ListingsCalendar({
  listings,
  today,
  date,
  stay,
  sample,
}: {
  listings: Listing[];
  today: string;
  date: string;
  /** The ?stay= value, used only when it names a reservation listed on `date` */
  stay?: string;
  sample: boolean;
}) {
  const history = sample ? null : await loadOwnerHistory();
  if (!sample && !history) {
    return (
      <Card as="section" padding="none" className={frame}>
        <h2 className="font-serif text-[32px] leading-10 text-ink">Calendar</h2>
        <p className="mt-2 text-[15px] leading-6 text-slate">We couldn’t load your bookings just now.</p>
      </Card>
    );
  }
  const stays = history ? calendarStays(history.bookings) : [];
  return (
    <Card as="section" padding="none" className={frame}>
      <BookingCalendar
        properties={calendarProperties(listings)}
        stays={stays}
        today={today}
        initialDate={date}
        initialStay={calendarStayParam(stay, date, stays)}
      />
    </Card>
  );
}

export function ListingsCalendarSkeleton() {
  return (
    <Card as="section" padding="none" className={frame}>
      <h2 className="font-serif text-[32px] leading-10 text-ink">Calendar</h2>
      <div aria-hidden className={`mt-5 h-[26rem] ${pulse}`} />
    </Card>
  );
}
