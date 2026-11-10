import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { firstName, groupBookings, toCancellationQuote, money, type Booking, type CancellationQuote } from "@/lib/bookings";
import { getAccount } from "@/utils/accounts";
import { getHotels } from "@/utils/hotels";
import { guestToday } from "@/utils/guest-today";
import { getCancellationQuote } from "@/utils/reservations";
import { getUserId } from "@/utils/user";
import { STAYS } from "@/app/_data/stays";
import { AccountSidebar, type AccountTab } from "./_components/AccountSidebar";
import { AccountTabContent, type Transaction } from "./_components/AccountTabContent";
import { CancelBookingDialog } from "./_components/CancelBooking";
import { PastBooking } from "./_components/PastBooking";
import { SampleNotice } from "./_components/SampleNotice";
import { SavedHotelsList } from "./_components/SavedHotelsList";
import { UpcomingBooking } from "./_components/UpcomingBooking";
import { getSampleBookings, getSampleQuote } from "./sampleBookings";
import { getMyBookings, getTransactionHistory, type TransactionHistoryRow } from "@/utils/history";
import { getPointsBalance } from "@/utils/points";

export const metadata: Metadata = { title: "My Bookings — LikeHome" };
const sectionHeading = "font-serif text-[32px] leading-10 text-ink";

async function loadMyBookings() {
  const { userId } = await getUserId();
  if (!userId) redirect(PAGE_ROUTES.LOGIN);

  const [
    account,
    bookingHistory,
    transactionHistory,
    hotelsResult,
    pointsResult,
  ] = await Promise.all([
    getAccount(userId),
    getMyBookings(),
    getTransactionHistory(),
    getHotels(),
    getPointsBalance(userId),
  ]);

  if (account.error) throw new Error(account.error.message);
  if (bookingHistory.error) {
    throw new Error(bookingHistory.error.message);
  }
  if (transactionHistory.error) {
    throw new Error(transactionHistory.error.message);
  }
  if (hotelsResult.error) {
    throw new Error(hotelsResult.error.message);
  }

  if (pointsResult.error) {
    throw new Error(pointsResult.error.message);
  }

  const bookings = bookingHistory.data ?? [];
  
  const transactionRows =
    (transactionHistory.data ?? []) as TransactionHistoryRow[];

  const transactions: Transaction[] = transactionRows.map((row) => ({
    id: row.id,
    title:
      row.transaction_type === "charge"
        ? "Booking payment"
        : row.transaction_type === "refund"
          ? "Refund"
          : row.transaction_type,
    subtitle: `${money(Number(row.amount))} · ${row.created_at.slice(0, 10)}`,
    status:
      row.status === "completed"
        ? row.transaction_type === "refund"
          ? "Refunded"
          : "Paid"
        : row.status,
    image: null,
  }));
  // Create lookup map from STAYS static data for reliable price/image matching
  const staysByName = new Map(
    STAYS.map((stay) => [stay.name.toLowerCase().trim(), stay])
  );

  const allHotels = (hotelsResult.data ?? []).map((h) => {
  const matchedStay = staysByName.get(h.name.toLowerCase().trim());

const staticPrices =
  matchedStay?.rooms
    .map((room) => room.nightly)
    .filter((price) => Number.isFinite(price) && price > 0) ?? [];

const staticPrice =
  staticPrices.length > 0 ? Math.min(...staticPrices) : null;

const databasePrice =
  h.min_price != null ? Number(h.min_price) : null;

const databaseRoomPrices = (h.rooms ?? [])
  .map((room: { price_per_night?: number | string | null }) => Number(room.price_per_night || 0))
  .filter((price: number) => Number.isFinite(price) && price > 0);

const databaseRoomPrice =
  databaseRoomPrices.length > 0 ? Math.min(...databaseRoomPrices) : null;

const price =
  databasePrice != null && Number.isFinite(databasePrice) && databasePrice > 0
    ? databasePrice
    : databaseRoomPrice ?? staticPrice;

  return {
    id: h.id,
    name: h.name,
    city: h.city ?? matchedStay?.location ?? null,
    region: h.region ?? null,
    country: h.country ?? null,
    photoUrl: h.photo_urls?.find(Boolean) ?? matchedStay?.photos?.[0] ?? null,
    pricePerNight: price,
    tags: h.tags ?? matchedStay?.tags ?? null,
  };
});

  return { name: account.data?.full_name ?? null, email: account.data?.email ?? null, bookings, transactions, allHotels, pointsBalance: pointsResult.balance };
}
// What cancelling each upcoming stay would cost. A quote that fails only leaves that cancel button unavailable.
async function loadQuotes(bookings: Booking[]) {
  const quotes = await Promise.all(
    bookings.map(async (b) => {
      const { data, error } = await getCancellationQuote(b.id);
      if (error) console.error("getCancellationQuote failed:", error);
      return [b.id, toCancellationQuote(data)] as const;
    }),
  );
  return new Map<string, CancellationQuote | null>(quotes);
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

  const { name, email, bookings, transactions, allHotels, pointsBalance } = showSample
    ? {
        ...getSampleBookings(today, sample === "empty"),
        allHotels: [],
        transactions: [],
        pointsBalance: 0,
      }
    : await loadMyBookings();

  const { upcoming, past, cancelled } = groupBookings(bookings, today);
  const quotes = showSample ? new Map(upcoming.map((b) => [b.id, getSampleQuote(b, today)])) : await loadQuotes(upcoming);
  const first = firstName(name);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {showSample && (
        <SampleNotice>Sample bookings, shown only on your local dev server. Take ?sample off the address to see your real bookings.</SampleNotice>
      )}

      {/* Ink, not blue or slate: lighter text on the sky strip is too faint to read */}
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink">Your account</p>
      <h1 className="mt-2 font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
        {activeTab === "saved"
          ? "Saved hotels"
          : activeTab === "account"
            ? "Your account"
            : first
              ? `Welcome back, ${first}`
              : "Welcome back"}
      </h1>
      <p className="mt-2 text-lg leading-7 text-ink">
        {activeTab === "saved"
          ? "Places you'd like to come back to."
          : activeTab === "account"
            ? "Manage your details, rewards and payments."
            : "Your upcoming and past reservations."}
      </p>

      {/* Reservations come first in the DOM (and on phones); grid placement moves the sidebar left from lg */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="space-y-10 lg:col-start-2 lg:row-start-1">
          {activeTab === "reservations" && (
            <>
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" tabIndex={-1} className={`${sectionHeading} outline-none`}>
              {upcoming.length === 1 ? "Upcoming reservation" : "Upcoming reservations"}
            </h2>
            {/* Above the list, so the dialog stays open with the result once the cancelled card is gone */}
            <CancelBookingDialog returnFocusTo="upcoming-heading" sample={showSample}>
              {upcoming.length > 0 ? (
                <ul className="mt-4 space-y-4">
                  {upcoming.map((booking, i) => (
                    <li key={booking.id}>
                      <UpcomingBooking
                        booking={booking}
                        href={`${PAGE_ROUTES.MY_BOOKINGS}/${booking.id}${showSample ? "?sample" : ""}`}
                        cancellation={quotes.get(booking.id) ?? null}
                        priority={i === 0}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <NoUpcoming firstTrip={past.length + cancelled.length === 0} />
              )}
            </CancelBookingDialog>
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className={sectionHeading}>
                Past reservations
              </h2>
              <ul className="mt-4 space-y-3">
                {past.map((booking) => (
                  <PastBooking key={booking.id} booking={booking} sample={showSample} />
                ))}
              </ul>
            </section>
          )}

                  {/* Cancelled Reservations Section */}
                  {cancelled.length > 0 && (
                      <section aria-labelledby="cancelled-heading">
                        <div className="flex items-center justify-between mb-4">
                          <h2 id="cancelled-heading" className={sectionHeading}>
                            Cancelled reservations
                          </h2>
                          <button type="button" className="text-xs font-semibold text-blue hover:text-blue-dark transition-colors">
                            View all &rarr;
                          </button>
                        </div>

                        <ul className="space-y-3">
                          {cancelled.map((booking) => (
                            <PastBooking key={booking.id} booking={booking} sample={showSample} />
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
                  <AccountTabContent name={name} email={email} transactions={transactions} pointsBalance={pointsBalance} />
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