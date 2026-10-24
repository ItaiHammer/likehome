import { Button, Tag } from "@/app/_components/ui";
import { bookingCode, bookingSummary, type Booking, type CancellationQuote } from "@/lib/bookings";
import { CancelBooking } from "./CancelBooking";
import { HotelPhoto } from "./HotelPhoto";

export function UpcomingBooking({
  booking,
  href,
  cancellation,
  sample = false,
  priority = false,
}: {
  booking: Booking;
  href: string;
  cancellation: CancellationQuote | null;
  sample?: boolean;
  priority?: boolean;
}) {
  return (
    <article className="flex flex-col gap-5 rounded-lg border border-edge bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5 xl:flex-nowrap">
      <HotelPhoto url={booking.photoUrl} priority={priority} className="aspect-[3/2] w-full sm:w-48" />
      <div className="min-w-0 flex-1">
        <Tag tone="blue">Confirmed</Tag>
        <h3 className="mt-2 break-words text-xl font-semibold text-ink">{booking.hotelName}</h3>
        <p className="mt-1 text-slate">{bookingSummary(booking)}</p>
        <p className="mt-1 text-sm text-slate">Booking {bookingCode(booking.id)}</p>
      </div>
      <div className="flex flex-wrap gap-3 sm:w-full xl:w-auto xl:flex-col">
        <Button href={href} className="grow basis-44 xl:flex-none">
          View booking
        </Button>
        <CancelBooking booking={booking} quote={cancellation} sample={sample} className="grow basis-44 xl:flex-none" />
        {/* "View stay" look from the search cards; px-1.5 insets it by the buttons' corner radius so it lines up with their edge */}
        <div className="flex w-full justify-end">
          <button
            type="button"
            title="Coming soon"
            className="rounded-control px-1.5 text-xs font-semibold text-blue transition-colors hover:text-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            Contact hotel
          </button>
        </div>
      </div>
    </article>
  );
}
