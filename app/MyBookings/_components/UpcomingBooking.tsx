import { Button, Tag } from "@/app/_components/ui";
import { bookingCode, bookingSummary, type Booking, type CancellationQuote } from "@/lib/bookings";
import { CancelBookingButton } from "./CancelBooking";
import { HotelPhoto } from "./HotelPhoto";
import { bookingDisplayName } from "./bookingDisplayName";
import { displayRoomName } from "@/app/reserve/[slug]/roomDisplay";

export function UpcomingBooking({
  booking,
  href,
  cancellation,
  priority = false,
}: {
  booking: Booking;
  href: string;
  cancellation: CancellationQuote | null;
  priority?: boolean;
}) {
  const summary = bookingSummary({ ...booking, roomType: booking.roomType ? displayRoomName(booking.roomType) : null });
  const guestSuffix = summary.match(/(\s*·\s*\d+\s+guests?)$/);
  return (
    <article className="flex flex-col gap-5 rounded-lg border border-edge bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5 xl:flex-nowrap">
      <HotelPhoto url={booking.photoUrl} priority={priority} className="aspect-[3/2] w-full sm:w-48" />
      <div className="min-w-0 flex-1">
        <Tag tone="blue">Confirmed</Tag>
        <h3 className="mt-2 break-words text-xl font-semibold text-ink">{bookingDisplayName(booking.hotelName)}</h3>
        <p className="mt-1 text-slate">{guestSuffix ? <>{summary.slice(0, -guestSuffix[0].length)}<span className="whitespace-nowrap">{guestSuffix[0]}</span></> : summary}</p>
        <p className="mt-1 text-sm text-slate">Booking {bookingCode(booking.id)}</p>
      </div>
      <div className="flex flex-wrap gap-3 sm:w-full xl:w-auto xl:flex-col">
        <Button href={href} className="grow basis-52 whitespace-nowrap xl:flex-none">
          View booking
        </Button>
        <CancelBookingButton booking={booking} quote={cancellation} className="grow basis-52 whitespace-nowrap xl:flex-none" />
      </div>
    </article>
  );
}