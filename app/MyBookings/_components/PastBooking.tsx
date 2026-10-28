import { Tag } from "@/app/_components/ui";
import { formatStayDates, type Booking } from "@/lib/bookings";
import { SoonButton } from "./SoonButton";

export function PastBooking({ booking }: { booking: Booking }) {
  const cancelled = booking.status === "cancelled";

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-edge bg-surface px-5 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 break-words font-semibold text-ink">{booking.hotelName}</h3>
          {cancelled && <Tag>Cancelled</Tag>}
        </div>
        <p className="mt-0.5 text-sm text-slate">{[booking.city, formatStayDates(booking.checkIn, booking.checkOut)].filter(Boolean).join(" · ")}</p>
      </div>
      {!cancelled && <SoonButton>Book again</SoonButton>}
    </li>
  );
}
