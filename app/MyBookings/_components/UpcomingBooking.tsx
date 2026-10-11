import { Tag } from "@/app/_components/ui";
import { bookingCode, bookingSummary, type Booking } from "@/lib/bookings";
import { HotelPhoto } from "./HotelPhoto";
import { SoonButton } from "./SoonButton";

export function UpcomingBooking({ booking, priority = false }: { booking: Booking; priority?: boolean }) {
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
        <SoonButton variant="primary" className="flex-1 xl:flex-none">
          View booking
        </SoonButton>
        <SoonButton className="flex-1 xl:flex-none">Contact hotel</SoonButton>
      </div>
    </article>
  );
}
