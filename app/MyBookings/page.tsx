import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { firstName, groupBookings, type Booking } from "@/lib/bookings";
import { getAccount } from "@/utils/accounts";
import { getHotelsByIds, getHotels } from "@/utils/hotels";
import { todayUTC } from "@/utils/reservation-logic";
import { guestToday } from "@/utils/guest-today";
import { getReservationsByAccount } from "@/utils/reservations";
import { getRoomsByIds } from "@/utils/rooms";
import { getUserId } from "@/utils/user";
import { STAYS } from "@/app/_data/stays";
import { AccountSidebar, type AccountTab } from "./_components/AccountSidebar";
import { AccountTabContent, type Transaction } from "./_components/AccountTabContent";
import { PastBooking } from "./_components/PastBooking";
import { SampleNotice } from "./_components/SampleNotice";
import { SavedHotelsList } from "./_components/SavedHotelsList";
import { UpcomingBooking } from "./_components/UpcomingBooking";
import { getSampleBookings } from "./sampleBookings";

export const metadata: Metadata = { title: "My Bookings — LikeHome" };

async function loadMyBookings() {
  const { userId } = await getUserId();
  if (!userId) redirect(PAGE_ROUTES.LOGIN);

  const [account, reservations, allHotelsRes] = await Promise.all([
    getAccount(userId),
    getReservationsByAccount(userId),
    getHotels(),
  ]);

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

  // Create lookup map from STAYS static data for reliable price/image matching
  const staysByHotelId = new Map(STAYS.map((s) => [s.hotelId || s.id, s]));
  const staysByName = new Map(STAYS.map((s) => [s.name.toLowerCase().trim(), s]));

  const allHotels = (allHotelsRes.data ?? []).map((h) => {
    const matchedStay = staysByHotelId.get(h.id) || staysByName.get(h.name.toLowerCase().trim());

    // Determine exact price from Supabase min_price, rooms, or static STAYS dataset
    let price: number | null = h.min_price ? Number(h.min_price) : null;

    if (!price && h.rooms && h.rooms.length > 0) {
      const validRoomPrices = h.rooms.map((r: any) => Number(r.price_per_night || 0)).filter(Boolean);
      if (validRoomPrices.length > 0) {
        price = Math.min(...validRoomPrices);
      }
    }

    if (!price && matchedStay) {
      const stayPrice = matchedStay.pricePerNight ?? matchedStay.price;
      price = stayPrice ? Number(stayPrice) : null;
    }

    return {
      id: h.id,
      name: h.name,
      city: h.city ?? matchedStay?.city ?? null,
      region: h.region ?? matchedStay?.region ?? null,
      country: h.country ?? matchedStay?.country ?? null,
      photoUrl: h.photo_urls?.find(Boolean) ?? matchedStay?.photoUrl ?? null,
      pricePerNight: price && !isNaN(price) && isFinite(price) ? price : null,
      tags: h.tags ?? matchedStay?.tags ?? null,
    };
  });

  return { name: account.data?.full_name ?? null, email: account.data?.email ?? null, bookings, allHotels };
}

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  // The guest's today (from their time zone cookie), not UTC's
  const today = await guestToday();
  // Dev only: ?sample (or ?sample=empty) fills the page without signing in, see sampleBookings.ts
  const { sample } = await searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;

  const { name, email, bookings, allHotels } = showSample
      ? { ...getSampleBookings(today, sample === "empty"), allHotels: [] }
      : await loadMyBookings();

  const { upcoming, past, cancelled } = groupBookings(bookings, today);
  const first = firstName(name);

  const transactions: Transaction[] = bookings.map((b) => ({
    id: b.id,
    title: b.hotelName,
    subtitle: "Transaction date · Booking payment",
    status: b.status === "cancelled" ? "Refunded" : "Paid",
    image: b.photoUrl,
  }));

  return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {showSample && (
            <SampleNotice>
              Sample bookings, shown only on your local dev server. Take ?sample off the address to see your real bookings.
            </SampleNotice>
        )}

        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">Your account</p>
        <h1 className="mt-1.5 font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
          {activeTab === "saved"
              ? "Saved hotels"
              : activeTab === "account" || (activeTab as string) === "details"
                  ? "Your account"
                  : first
                      ? `Welcome back, ${first}`
                      : "Welcome back"}
        </h1>
        <p className="mt-2 text-base leading-6 text-slate">
          {activeTab === "saved"
              ? "Places you'd like to come back to."
              : activeTab === "account" || (activeTab as string) === "details"
                  ? "Manage your details, rewards and payments."
                  : "Your upcoming and past reservations."}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="space-y-10 lg:col-start-2 lg:row-start-1 min-w-0 max-w-[800px]">
            {activeTab === "reservations" && (
                <>
                  {/* Upcoming Reservations Section */}
                  <section aria-labelledby="upcoming-heading">
                    <div className="flex items-center justify-between mb-4">
                      <h2 id="upcoming-heading" className="font-serif text-[28px] leading-8 font-bold text-ink">
                        Upcoming reservations
                      </h2>
                      <button type="button" className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors">
                        View all &rarr;
                      </button>
                    </div>

                    {upcoming.length > 0 ? (
                        <ul className="space-y-4">
                          {upcoming.map((booking, i) => (
                              <li key={booking.id}>
                                <UpcomingBooking
                                    booking={booking}
                                    href={`${PAGE_ROUTES.MY_BOOKINGS}/${booking.id}${showSample ? "?sample" : ""}`}
                                    priority={i === 0}
                                />
                              </li>
                          ))}
                        </ul>
                    ) : (
                        <NoUpcoming firstTrip={past.length + cancelled.length === 0} />
                    )}
                  </section>

                  {/* Past Reservations Section */}
                  {past.length > 0 && (
                      <section aria-labelledby="past-heading">
                        <div className="flex items-center justify-between mb-4">
                          <h2 id="past-heading" className="font-serif text-[28px] leading-8 font-bold text-ink">
                            Past reservations
                          </h2>
                          <button type="button" className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors">
                            View all &rarr;
                          </button>
                        </div>

                        <ul className="space-y-3">
                          {past.map((booking) => (
                              <li key={booking.id}>
                                <PastBooking booking={booking} />
                              </li>
                          ))}
                        </ul>
                      </section>
                  )}

                  {/* Cancelled Reservations Section */}
                  {cancelled.length > 0 && (
                      <section aria-labelledby="cancelled-heading">
                        <div className="flex items-center justify-between mb-4">
                          <h2 id="cancelled-heading" className="font-serif text-[28px] leading-8 font-bold text-ink">
                            Cancelled reservations
                          </h2>
                          <button type="button" className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors">
                            View all &rarr;
                          </button>
                        </div>

                        <ul className="space-y-3">
                          {cancelled.map((booking) => (
                              <li key={booking.id}>
                                <PastBooking booking={booking} isCancelled />
                              </li>
                          ))}
                        </ul>
                      </section>
                  )}
                </>
            )}

            {activeTab === "saved" && (
                <section aria-labelledby="saved-heading">
                  <SavedHotelsList allHotels={allHotels} />
                </section>
            )}

            {(activeTab === "account" || (activeTab as string) === "details") && (
                <section aria-labelledby="account-heading">
                  <AccountTabContent name={name} email={email} transactions={transactions} />
                </section>
            )}
          </div>

          <AccountSidebar
              name={name}
              email={email}
              activeTab={activeTab === ("details" as any) ? "account" : activeTab}
              className="max-w-sm lg:col-start-1 lg:row-start-1"
          />
        </div>
      </main>
  );
}

function NoUpcoming({ firstTrip }: { firstTrip: boolean }) {
  return (
      <div className="rounded-2xl border border-edge bg-surface p-6 sm:p-8 shadow-sm">
        <p className="text-lg font-semibold text-ink">{firstTrip ? "No bookings yet" : "No upcoming trips"}</p>
        <p className="mt-1 text-slate text-sm">When you book a stay, it shows up here.</p>
        <Button href="/search" className="mt-5">
          Find a stay
        </Button>
      </div>
  );
}