import { stayDisplayName } from "@/app/_components/stayDisplayName";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowIcon, Button, Card } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { bookingCode, formatStayDates, money } from "@/lib/bookings";
import { displayRoomName } from "@/app/reserve/[slug]/roomDisplay";
import { formatPoints, pointsShortfall, pointsToDollars, shortfallNote, shownPointsParam } from "@/lib/rewards";
import { countNights } from "@/utils/reservation-logic";
import { guestToday } from "@/utils/guest-today";
import { getPaymentsByReservation } from "@/utils/payments";
import { getPointsBalance } from "@/utils/points";
import { getPointsUsedOnBooking } from "@/utils/rewards";
import { getAmountPaid } from "@/utils/transactions";
import { getHotelStay } from "../../../reserve/[slug]/hotelStay";
import { HotelPhoto } from "../../_components/HotelPhoto";
import { SampleNotice } from "../../_components/SampleNotice";
import { getSampleBooking } from "../../sampleBookings";
import { SAMPLE_BALANCE } from "../../rewards/sampleRewards";
import { loadReservation, toBooking } from "../booking";

export const metadata: Metadata = { title: "Booking confirmed — LikeHome" };

// Read per request with the sign-in cookie, which a prerendered page can't do (see the stay page)
export const dynamic = "force-dynamic";

async function loadConfirmation(id: string, today: string) {
  const { userId, reservation: r } = await loadReservation(id, `${PAGE_ROUTES.MY_BOOKINGS}/${id}/confirmed`);
  // A booking whose payment failed is cancelled by /api/checkout, so there's nothing to confirm
  if (r.status === "cancelled") redirect(`${PAGE_ROUTES.MY_BOOKINGS}/${id}`);
  const [stay, payments, amountPaid, pointsUsed, points] = await Promise.all([
    getHotelStay(r.hotel_id),
    getPaymentsByReservation(r.id),
    getAmountPaid(r.id),
    getPointsUsedOnBooking(r.id),
    getPointsBalance(userId),
  ]);
  // The rewards card is extra: if points can't be read, it's left out instead of failing the page
  const rewards = pointsUsed.error || points.error ? null : { used: pointsUsed.data, balance: points.balance };
  // payments.card_number holds only the last 4 digits; there's no card brand column
  const last4 = (payments.data?.[0]?.card_number as string | undefined) ?? null;
  // What was charged, which a later change to the booking doesn't alter (changes aren't charged yet).
  // $0 is a real amount when points covered the whole stay.
  const pointsSpent = pointsUsed.error ? 0 : pointsUsed.data;
  const charged = amountPaid.data;
  const paid = charged !== null && (charged > 0 || pointsSpent > 0) ? charged : null;
  return { booking: toBooking(r, stay, today), roomName: stay?.rooms.find((room) => room.id === r.room_id)?.name ?? null, last4, paid, rewards };
}

// Omar's confirmation design (#70), filled from the saved booking. The rewards card shows points used, not earned (nothing earns points yet).
export default async function BookingConfirmedPage(props: PageProps<"/MyBookings/[id]/confirmed">) {
  const { id } = await props.params;
  // The guest's today (from their time zone cookie), not UTC's
  const today = await guestToday();
  // Dev only, like /MyBookings?sample
  const { sample, points: shownParam } = await props.searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const sampleData = showSample ? getSampleBooking(id, today) : null;
  const data = showSample
    ? sampleData && {
        booking: sampleData.booking,
        roomName: sampleData.rooms.find((r) => r.id === sampleData.booking.roomId)?.name ?? null,
        last4: "4242",
        paid: Math.max(0, sampleData.booking.total - pointsToDollars(26850)),
        rewards: { used: 26850, balance: SAMPLE_BALANCE },
      }
    : await loadConfirmation(id, today);
  if (!data) notFound();

  const { booking, roomName, last4, paid, rewards } = data;
  const nights = countNights(booking.checkIn, booking.checkOut);
  const bookingHref = `${PAGE_ROUTES.MY_BOOKINGS}/${booking.id}${showSample ? "?sample" : ""}`;
  const listHref = showSample ? `${PAGE_ROUTES.MY_BOOKINGS}?sample` : PAGE_ROUTES.MY_BOOKINGS;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      {showSample && <SampleNotice>A sample booking, shown only on your local dev server.</SampleNotice>}

      <Card padding="none" className="p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue/10 text-blue-dark">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.08em] text-blue-dark">Booking confirmed</p>
        <h1 className="mt-2 text-balance break-words font-serif text-[32px] leading-10 text-ink sm:text-[40px] sm:leading-[48px]">
          You’re going to {stayDisplayName(booking.hotelName)}!
        </h1>
        <p className="mt-2 text-base text-slate">Your booking is saved. You can view or change it any time in My Bookings.</p>
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-2 rounded-lg border border-edge bg-paper px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate">Confirmation code</span>
          <span className="font-mono text-lg font-bold text-blue-dark">{bookingCode(booking.id)}</span>
        </div>
      </Card>

      <Card as="section" className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">Reservation details</h2>
          <Link href={bookingHref} className="group inline-flex shrink-0 items-center gap-1 text-base font-semibold text-blue hover:text-blue-dark">
            View booking
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        <div className="mt-4 grid gap-6 sm:grid-cols-[12rem_1fr]">
          <HotelPhoto url={booking.photoUrl} priority className="aspect-[4/3] w-full" />
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-ink">{stayDisplayName(booking.hotelName)}</h3>
            {booking.location && <p className="text-sm text-slate">{booking.location}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-edge pt-4 text-sm">
              {roomName && <Detail label="Room type" value={displayRoomName(roomName)} />}
              <Detail label="Dates" value={formatStayDates(booking.checkIn, booking.checkOut)} />
              <Detail label="Nights" value={`${nights} ${nights === 1 ? "night" : "nights"}`} />
              <Detail label="Guests" value={`${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}`} />
            </dl>
          </div>
        </div>

        <div className="mt-6 border-t border-edge pt-6">
          <h3 className="text-base font-semibold text-ink">Payment summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {rewards && rewards.used > 0 && (
              <div className="flex justify-between gap-4 text-slate">
                <dt>Paid with points</dt>
                <dd>
                  {formatPoints(rewards.used)} ({money(pointsToDollars(rewards.used))})
                </dd>
              </div>
            )}
            {last4 && paid !== 0 && (
              <div className="flex justify-between gap-4 text-slate">
                <dt>Paid with</dt>
                <dd>Card ending {last4}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 border-t border-edge pt-2 text-base font-bold text-ink">
              <dt>{paid !== null ? "Total paid" : "Total"}</dt>
              <dd>{money(paid ?? booking.total)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {rewards && (
        <RewardsUsed
          used={rewards.used}
          balance={rewards.balance}
          shortfall={pointsShortfall(shownPointsParam(shownParam), rewards.used)}
          paid={paid}
          href={`${PAGE_ROUTES.REWARDS}${showSample ? "?sample" : ""}`}
        />
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button href={listHref}>Go to My Bookings</Button>
        <Button href="/search" variant="secondary">
          Explore more stays
        </Button>
      </div>
    </main>
  );
}

// Figma frame 07's "Your rewards" card, without "You'll earn": checkout_reservation records points spent, nothing records points earned yet
function RewardsUsed({ used, balance, shortfall, paid, href }: { used: number; balance: number; shortfall: number; paid: number | null; href: string }) {
  return (
    <Card as="section" tone="tint" className="mt-6">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-dark">Your rewards</p>
      <h2 className="mt-2 font-serif text-[28px] leading-9 text-ink">
        {used > 0 ? `You saved ${money(pointsToDollars(used))} with points` : "Your points"}
      </h2>
      <dl className="mt-4 space-y-2 text-base">
        {used > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink">Points used on this stay</dt>
            <dd className="font-semibold text-ink">{formatPoints(used)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ink">Your balance now</dt>
          <dd className="font-semibold text-ink">{formatPoints(balance)}</dd>
        </div>
      </dl>
      {shortfall > 0 && (
        <p className="mt-4 rounded-lg border border-edge bg-surface p-3 text-sm text-ink">{shortfallNote(shortfall, paid)}</p>
      )}
      <Link href={href} className="group mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-dark hover:text-blue">
        View rewards
        <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase text-slate">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}
