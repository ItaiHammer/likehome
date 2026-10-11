import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { firstName, groupBookings, type Booking } from "@/lib/bookings";
import { getAccount } from "@/utils/accounts";
import { getHotelsByIds } from "@/utils/hotels";
import { todayUTC } from "@/utils/reservation-logic";
import { getReservationsByAccount } from "@/utils/reservations";
import { getRoomsByIds } from "@/utils/rooms";
import { getUserId } from "@/utils/user";
import { AccountSidebar } from "./_components/AccountSidebar";
import { PastBooking } from "./_components/PastBooking";
import { UpcomingBooking } from "./_components/UpcomingBooking";
import { getSampleBookings } from "./sampleBookings";

export const metadata: Metadata = { title: "My bookings — LikeHome" };

const sectionHeading = "font-serif text-[32px] leading-10 text-ink";

async function loadMyBookings() {
  const { userId } = await getUserId();
  if (!userId) redirect(PAGE_ROUTES.LOGIN);

  const [account, reservations] = await Promise.all([getAccount(userId), getReservationsByAccount(userId)]);
  if (reservations.error) throw new Error(reservations.error.message);
  const rows = reservations.data ?? [];

  const hotelIds = [...new Set(rows.map((r) => r.hotel_id))];
  const roomIds = [...new Set(rows.map((r) => r.room_id))];
  const [hotels, rooms] = await Promise.all([
    hotelIds.length ? getHotelsByIds(hotelIds) : { data: [], error: null },
    roomIds.length ? getRoomsByIds(roomIds) : { data: [], error: null },
  ]);
  if (hotels.error) throw new Error(hotels.error.message);
  if (rooms.error) throw new Error(rooms.error.message);
  const hotelById = new Map(hotels.data?.map((h) => [h.id, h]));
  const roomById = new Map(rooms.data?.map((r) => [r.id, r]));

  const bookings: Booking[] = rows.map((r) => {
    const hotel = hotelById.get(r.hotel_id);
    return {
      id: r.id,
      checkIn: r.check_in,
      checkOut: r.check_out,
      guests: r.guests ?? null,
      status: r.status ?? "confirmed",
      hotelName: hotel?.name ?? "Hotel no longer listed",
      city: hotel?.city ?? null,
      photoUrl: hotel?.photo_urls?.find(Boolean) ?? null,
      roomType: roomById.get(r.room_id)?.room_type ?? null,
    };
  });

  return { name: account.data?.full_name ?? null, email: account.data?.email ?? null, bookings };
}

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const today = todayUTC();
  // Dev only: ?sample (or ?sample=empty) fills the page without signing in, see sampleBookings.ts
  const { sample } = await searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const { name, email, bookings } = showSample ? getSampleBookings(today, sample === "empty") : await loadMyBookings();
  const { upcoming, past, cancelled } = groupBookings(bookings, today);
  const first = firstName(name);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {showSample && <SampleNotice />}

      {/* Ink, not blue or slate: lighter text on the sky strip is too faint to read */}
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink">Your account</p>
      <h1 className="mt-2 font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
        {first ? `Welcome back, ${first}` : "Welcome back"}
      </h1>
      <p className="mt-2 text-lg leading-7 text-ink">Your upcoming and past reservations.</p>

      {/* Reservations come first in the DOM (and on phones); grid placement moves the sidebar left from lg */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="space-y-10 lg:col-start-2 lg:row-start-1">
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className={sectionHeading}>
              {upcoming.length === 1 ? "Upcoming reservation" : "Upcoming reservations"}
            </h2>
            {upcoming.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {upcoming.map((booking, i) => (
                  <li key={booking.id}>
                    <UpcomingBooking booking={booking} priority={i === 0} />
                  </li>
                ))}
              </ul>
            ) : (
              <NoUpcoming firstTrip={past.length + cancelled.length === 0} />
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className={sectionHeading}>
                Past reservations
              </h2>
              <ul className="mt-4 space-y-3">
                {past.map((booking) => (
                  <PastBooking key={booking.id} booking={booking} />
                ))}
              </ul>
            </section>
          )}

          {cancelled.length > 0 && (
            <section aria-labelledby="cancelled-heading">
              <h2 id="cancelled-heading" className={sectionHeading}>
                Cancelled reservations
              </h2>
              <ul className="mt-4 space-y-3">
                {cancelled.map((booking) => (
                  <PastBooking key={booking.id} booking={booking} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <AccountSidebar name={name} email={email} className="max-w-sm lg:col-start-1 lg:row-start-1" />
      </div>
    </main>
  );
}

function NoUpcoming({ firstTrip }: { firstTrip: boolean }) {
  return (
    <div className="mt-4 rounded-lg border border-edge bg-surface p-6 sm:p-8">
      <p className="text-lg font-semibold text-ink">{firstTrip ? "No bookings yet" : "No upcoming trips"}</p>
      <p className="mt-1 text-slate">When you book a stay, it shows up here.</p>
      <Button href="/search" className="mt-5">
        Find a stay
      </Button>
    </div>
  );
}

function SampleNotice() {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-lg border border-edge bg-surface/75 px-4 py-3 text-sm text-slate">
      <span className="mt-0.5 inline-flex shrink-0 rounded-control bg-blue/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-blue-dark">
        Demo data
      </span>
      <p>Sample bookings, shown only on your local dev server. Take ?sample off the address to see your real bookings.</p>
    </div>
  );
}
