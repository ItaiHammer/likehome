import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { POPULAR_DESTINATIONS } from "@/app/_data/destinations";
import { HotelPhoto } from "@/app/MyBookings/_components/HotelPhoto";
import { ArrowIcon, arrowSlideClass, Card, SectionHeading, tintLink } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import type { HomeShortcut } from "@/lib/account/home";
import { bookingSummary, changeBlocker } from "@/lib/bookings";
import { inboxHint, nextTrip, pointsSummary, tripLabel } from "@/lib/home-traveler";
import { unreadCount } from "@/lib/messages";
import { guestToday } from "@/utils/guest-today";
import { getMyBookings } from "@/utils/history";
import { getInbox } from "@/utils/inbox";
import { getPointsBalance } from "@/utils/points";
import { CardAction } from "./ShortcutTile";
import { blockFrame, cardLabel, pulse } from "./styles";

const TITLE_ID = "traveler-summary-title";
const SHORTCUTS_ID = "traveler-shortcuts-title";

// Personal: the next trip, points and shortcuts in a white frame, under a heading lined up with the
// rows below. Phones drop the frame and the cards stack. Each card's read streams in on its own.
export function TravelerSummary({
  accountId,
  title,
  body,
  shortcuts,
}: {
  accountId: string;
  title: string;
  body: string;
  shortcuts: HomeShortcut[];
}) {
  return (
    <section aria-labelledby={TITLE_ID}>
      <SectionHeading id={TITLE_ID} title={title} subtitle={body} />

      <div className={`mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] ${blockFrame} sm:py-9`}>
        <div className="grid sm:col-span-2 lg:col-span-1">
          <Suspense fallback={<div aria-hidden className={`h-72 sm:h-44 ${pulse}`} />}>
            <NextTrip />
          </Suspense>
        </div>
        <Suspense fallback={<div aria-hidden className={`h-48 ${pulse}`} />}>
          <Points accountId={accountId} />
        </Suspense>
        <Shortcuts shortcuts={shortcuts} />
      </div>
    </section>
  );
}

// The same read and grouping as My Bookings; null when it failed
async function loadNextTrip() {
  try {
    const [today, { data, error }] = await Promise.all([guestToday(), getMyBookings()]);
    if (!error) return { today, trip: nextTrip(data ?? [], today) };
    console.error("Next trip read failed", error);
  } catch (error) {
    console.error("Next trip read failed", error);
  }
  return null;
}

async function NextTrip() {
  const result = await loadNextTrip();
  if (!result) {
    return <TripCard label="Next trip" title="Your trips" body="We couldn’t load your next trip just now." action="Open My Bookings" href={PAGE_ROUTES.MY_BOOKINGS} />;
  }
  const { today, trip } = result;
  if (!trip) {
    return <FirstTrip />;
  }

  return (
    <TripCard
      href={`${PAGE_ROUTES.MY_BOOKINGS}/${trip.id}`}
      photo={<HotelPhoto url={trip.photoUrl} className="h-36 w-full rounded-none sm:h-auto sm:min-h-40 sm:w-36" />}
      label={tripLabel(trip.checkIn, today)}
      title={trip.hotelName}
      body={bookingSummary(trip)}
      // From check-in day on, the booking page only shows it
      action={changeBlocker(trip, today) ? "View booking" : "View or change booking"}
    />
  );
}

// No trips yet: the booked trip's shape, with a destination photo in the hotel photo's place
function FirstTrip() {
  const { photo } = POPULAR_DESTINATIONS.near[0];
  return (
    <TripCard
      href={PAGE_ROUTES.SEARCH}
      photo={
        <div className="relative h-36 w-full shrink-0 sm:h-auto sm:min-h-40 sm:w-36">
          <Image src={photo} alt="" fill sizes="(min-width: 640px) 144px, 100vw" placeholder="blur" className="object-cover" />
        </div>
      }
      label="Next trip"
      title="Plan your first trip"
      body="When you book a stay, it shows up here."
      action="Browse stays"
    />
  );
}

// The next-trip card: a photo beside the text when there is one
function TripCard({ href, photo, label, title, body, action }: { href: string; photo?: React.ReactNode; label: string; title: string; body: string; action: string }) {
  const text = (
    <>
      <h3 className={cardLabel}>{label}</h3>
      <p className="mt-1.5 font-bold text-[26px] leading-8 text-ink [overflow-wrap:anywhere]">{title}</p>
      <p className="mt-1.5 text-[15px] leading-6 text-slate">{body}</p>
      <CardAction>{action}</CardAction>
    </>
  );
  if (!photo) {
    return (
      <Card href={href}>
        <div className="flex h-full flex-col">{text}</div>
      </Card>
    );
  }
  return (
    <Card href={href} padding="none" className="overflow-hidden">
      <div className="flex h-full flex-col sm:flex-row">
        {photo}
        <div className="flex min-w-0 flex-1 flex-col p-5 sm:px-[22px]">{text}</div>
      </div>
    </Card>
  );
}

async function Points({ accountId }: { accountId: string }) {
  let balance: number | null = null;
  try {
    const result = await getPointsBalance(accountId);
    if (result.error) console.error("Points balance read failed", result.error.message);
    else balance = Number(result.balance);
  } catch (error) {
    console.error("Points balance read failed", error);
  }
  const { value, line } = pointsSummary(balance);

  return (
    <Link href={PAGE_ROUTES.REWARDS} className={`${tintLink} flex flex-col p-5 sm:px-[22px]`}>
      <h3 className={cardLabel}>Your points</h3>
      {value !== null && <p className="mt-1.5 font-bold text-[40px] leading-[44px] text-ink">{value}</p>}
      <p className="mt-1.5 text-[15px] leading-6 text-slate">{line}</p>
      <CardAction>See your rewards</CardAction>
    </Link>
  );
}

function Shortcuts({ shortcuts }: { shortcuts: HomeShortcut[] }) {
  return (
    <nav aria-labelledby={SHORTCUTS_ID} className="overflow-hidden rounded-lg border border-edge bg-surface">
      <h3 id={SHORTCUTS_ID} className="sr-only">
        Shortcuts
      </h3>
      <ul className="flex h-full flex-col divide-y divide-edge/60">
        {shortcuts.map((s) => (
          <li key={s.href} className="flex flex-1">
            <Link
              href={s.href}
              className="group flex min-h-[72px] flex-1 items-center justify-between gap-4 px-5 py-3 transition-colors duration-200 hover:bg-blue/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue sm:min-h-16 sm:px-[18px]"
            >
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-6 text-ink sm:text-[15px]">{s.label}</span>
                <span className="block text-[15px] leading-6 text-slate sm:text-sm sm:leading-5">
                  {s.unread ? (
                    <Suspense fallback={s.hint}>
                      <UnreadHint fallback={s.hint} />
                    </Suspense>
                  ) : (
                    s.hint
                  )}
                </span>
              </span>
              <ArrowIcon className={`shrink-0 text-blue-dark ${arrowSlideClass}`} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// The same cached read as the header bell's, so it costs no second query
async function UnreadHint({ fallback }: { fallback: string }) {
  let unread: number | null = null;
  try {
    const { messages, error } = await getInbox();
    if (error) console.error("Inbox read failed", error);
    else unread = unreadCount(messages);
  } catch (error) {
    console.error("Inbox read failed", error);
  }
  return <>{inboxHint(unread, fallback)}</>;
}
