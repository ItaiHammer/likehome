import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { firstName, groupBookings, type Booking } from "@/lib/bookings";
import { getAccount } from "@/utils/accounts";
import { getHotels } from "@/utils/hotels";
import { guestToday } from "@/utils/guest-today";
import { getUserId } from "@/utils/user";
import { AccountSidebar, type AccountTab } from "./_components/AccountSidebar";
import { AccountTabContent, type Transaction } from "./_components/AccountTabContent";
import { PastBooking } from "./_components/PastBooking";
import { SampleNotice } from "./_components/SampleNotice";
import { SavedHotelsList } from "./_components/SavedHotelsList";
import { UpcomingBooking } from "./_components/UpcomingBooking";
import { getSampleBookings } from "./sampleBookings";
import { getMyBookings } from "@/utils/history";

export const metadata: Metadata = { title: "My Bookings — LikeHome" };

async function loadMyBookings() {
  const { userId } = await getUserId();
  if (!userId) redirect(PAGE_ROUTES.LOGIN);

  const [account, bookingHistory, hotelsResult] = await Promise.all([
    getAccount(userId),
    getMyBookings(),
    getHotels(),
  ]);

  if (bookingHistory.error) {
    throw new Error(bookingHistory.error.message);
  }
  if (hotelsResult.error) {
    throw new Error(hotelsResult.error.message);
  }

  return {
    name: account.data?.full_name ?? null,
    email: account.data?.email ?? null,
    bookings: bookingHistory.data ?? [],
    allHotels: hotelsResult.data ?? [],
  };
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sample?: string;
    tab?: string;
  }>;
}) {
  // The guest's today (from their time zone cookie), not UTC's
  const today = await guestToday();
  // Dev only: ?sample (or ?sample=empty) fills the page without signing in, see sampleBookings.ts
  const { sample, tab } = await searchParams;
  const activeTab: AccountTab =
    tab === "saved"
      ? "saved"
      : tab === "account"
        ? "account"
        : "reservations";
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
              : activeTab === "account"
                  ? "Your account"
                  : first
                      ? `Welcome back, ${first}`
                      : "Welcome back"}
        </h1>
        <p className="mt-2 text-base leading-6 text-slate">
          {activeTab === "saved"
              ? "Places you'd like to come back to."
              : activeTab === "account"
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

            {activeTab === "account" && (
                <section aria-labelledby="account-heading">
                  <AccountTabContent name={name} email={email} transactions={transactions} />
                </section>
            )}
          </div>

          <AccountSidebar
              name={name}
              email={email}
              activeTab={activeTab}
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