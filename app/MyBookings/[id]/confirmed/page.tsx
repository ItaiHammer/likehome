import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { bookingCode, formatStayDates, money } from "@/lib/bookings";
import { countNights, todayUTC } from "@/utils/reservation-logic";
import { getPaymentsByReservation } from "@/utils/payments";
import { getAmountPaid } from "@/utils/transactions";
import { getHotelStay } from "../../../reserve/[slug]/hotelStay";
import { HotelPhoto } from "../../_components/HotelPhoto";
import { SampleNotice } from "../../_components/SampleNotice";
import { getSampleBooking } from "../../sampleBookings";
import { loadReservation, toBooking } from "../booking";

export const metadata: Metadata = { title: "Booking confirmed — LikeHome" };

// Read per request with the sign-in cookie, which a prerendered page can't do (see the stay page)
export const dynamic = "force-dynamic";

async function loadConfirmation(id: string, today: string) {
  const { reservation: r } = await loadReservation(id, `${PAGE_ROUTES.MY_BOOKINGS}/${id}/confirmed`);
  // A booking whose payment failed is cancelled by /api/checkout, so there's nothing to confirm
  if (r.status === "cancelled") redirect(`${PAGE_ROUTES.MY_BOOKINGS}/${id}`);
  const [stay, payments, amountPaid] = await Promise.all([getHotelStay(r.hotel_id), getPaymentsByReservation(r.id), getAmountPaid(r.id)]);
  // payments.card_number holds only the last 4 digits; there's no card brand column
  const last4 = (payments.data?.[0]?.card_number as string | undefined) ?? null;
  // What was charged, which a later change to the booking doesn't alter (changes aren't charged yet)
  const paid = amountPaid.data && amountPaid.data > 0 ? amountPaid.data : null;
  return { booking: toBooking(r, stay, today), roomName: stay?.rooms.find((room) => room.id === r.room_id)?.name ?? null, last4, paid };
}

// Mykaela's rewards Figma confirmation (US 7.2.1), without the rewards card until points can be earned
export default async function BookingConfirmedPage(props: PageProps<"/MyBookings/[id]/confirmed">) {
  const { id } = await props.params;
  const today = todayUTC();
  // Dev only, like /MyBookings?sample
  const { sample } = await props.searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const sampleData = showSample ? getSampleBooking(id, today) : null;
  const data = showSample
    ? sampleData && {
        booking: sampleData.booking,
        roomName: sampleData.rooms.find((r) => r.id === sampleData.booking.roomId)?.name ?? null,
        last4: "4242",
        paid: sampleData.booking.total,
      }
    : await loadConfirmation(id, today);
  if (!data) notFound();

  const { booking, roomName, last4, paid } = data;
  const nights = countNights(booking.checkIn, booking.checkOut);
  const bookingHref = `${PAGE_ROUTES.MY_BOOKINGS}/${booking.id}${showSample ? "?sample" : ""}`;
  const listHref = showSample ? `${PAGE_ROUTES.MY_BOOKINGS}?sample` : PAGE_ROUTES.MY_BOOKINGS;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      {showSample && <SampleNotice>A sample booking, shown only on your local dev server.</SampleNotice>}

      {/* Ink, not blue or slate: lighter text on the sky strip is too faint to read */}
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          Booking confirmed
        </p>
        <h1 className="mt-3 text-balance break-words font-serif text-[40px] leading-[48px] text-ink sm:text-[56px] sm:leading-[64px]">
          You’re going to {booking.hotelName}!
        </h1>
        <p className="mt-3 text-lg leading-7 text-ink">
          View or edit your reservation in{" "}
          <Link href={listHref} className="font-semibold text-blue underline underline-offset-4 hover:text-blue-dark">
            My Bookings
          </Link>
        </p>
        <p className="mt-2 text-base text-ink">
          Confirmation <span className="font-semibold">{bookingCode(booking.id)}</span>
        </p>
      </div>

      <section aria-label="Your booking" className="mt-10 flex flex-col gap-5 rounded-2xl border border-edge bg-surface p-5 sm:flex-row sm:p-6">
        <HotelPhoto url={booking.photoUrl} priority className="aspect-[3/2] w-full sm:aspect-square sm:w-40" />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="min-w-0 break-words text-xl font-semibold text-ink">{booking.hotelName}</h2>
              <Link href={bookingHref} className="group inline-flex shrink-0 items-center gap-1 text-base font-semibold text-blue hover:text-blue-dark">
                View booking
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
            {booking.location && <p className="mt-0.5 text-slate">{booking.location}</p>}
            <p className="mt-3 text-slate">{[roomName, formatStayDates(booking.checkIn, booking.checkOut)].filter(Boolean).join(" · ")}</p>
            <p className="text-slate">
              {nights} {nights === 1 ? "night" : "nights"} · {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
            </p>
          </div>
          <dl className="mt-auto border-t border-edge pt-4">
            <div className="flex items-baseline justify-between gap-4 text-base font-bold text-ink">
              <dt>{paid !== null ? "Total paid" : "Total"}</dt>
              <dd>{money(paid ?? booking.total)}</dd>
            </div>
            {last4 && (
              <div className="mt-1 flex justify-between gap-4 text-sm text-slate">
                <dt>Paid with</dt>
                <dd>Card ending {last4}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <Button href="/search" variant="secondary">
          Explore more stays
        </Button>
      </div>
    </main>
  );
}
