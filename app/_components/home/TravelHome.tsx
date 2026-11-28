import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { POPULAR_DESTINATIONS } from "@/app/_data/destinations";
import { HotelPhoto } from "@/app/MyBookings/_components/HotelPhoto";
import { ArrowIcon, arrowSlideClass, Button, Card, SectionHeading, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import type { HomeShortcut } from "@/lib/account/home";
import { bookingSummary, changeBlocker } from "@/lib/bookings";
import { inboxHint, nextTrip, pointsSummary, tripLabel } from "@/lib/home-traveler";
import { unreadCount } from "@/lib/messages";
import { guestToday } from "@/utils/guest-today";
import { getMyBookings } from "@/utils/history";
import { getInbox } from "@/utils/inbox";
import { getPointsBalance } from "@/utils/points";
import styles from "./HomeLayout.module.css";

export function TravelWelcome({ title, body }: { title: string; body: string }) {
  return (
    <section aria-labelledby="travel-welcome-title" className="overflow-hidden rounded-lg border border-edge bg-surface lg:flex lg:items-center">
      <div className={`relative hidden h-36 w-52 shrink-0 lg:block ${styles.welcomeImage}`}>
        <Image
            src="/login/likehome-coastal-room-signin.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 200px, 208px"
            className="object-cover object-center"
        />
      </div>
      <div className={`flex flex-1 flex-wrap items-center justify-between gap-5 px-6 py-6 lg:gap-6 lg:px-7 ${styles.welcomeContent}`}>
        <div className="min-w-0 lg:border-l lg:border-edge lg:pl-7">
          <h2 id="travel-welcome-title" className={`text-[28px] font-bold leading-9 text-ink ${styles.welcomeTitle}`}>{title}</h2>
          <p className="mt-1 text-base leading-6 text-slate">{body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button href={PAGE_ROUTES.MY_BOOKINGS}>My Bookings</Button>
          <Button href={PAGE_ROUTES.SEARCH} variant="secondary">Browse stays</Button>
        </div>
      </div>
    </section>
  );
}

// The compact welcome leads into destinations. All account tools remain together below them.
export function TravelOverview({ accountId, shortcuts }: { accountId: string; shortcuts: HomeShortcut[] }) {
  return (
    <section aria-labelledby="travel-overview-title">
      <SectionHeading id="travel-overview-title" title="Your travel overview" subtitle="Your next trip, rewards, and quick links at a glance." />
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Suspense fallback={<OverviewSkeleton />}><TripOverview /></Suspense>
        <Suspense fallback={<OverviewSkeleton />}><PointsOverview accountId={accountId} /></Suspense>
        <nav aria-label="Shortcuts" className="rounded-lg border border-edge bg-surface px-5 py-2">
          <h3 className="sr-only">Shortcuts</h3>
          <ul className="divide-y divide-edge/70">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.href}>
                <Link href={shortcut.href} className="group flex min-h-[72px] items-center justify-between gap-4 rounded-control py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-ink">{shortcut.label}</span>
                    <span className="block text-sm leading-6 text-slate">
                      {shortcut.unread ? <Suspense fallback={shortcut.hint}><UnreadHint fallback={shortcut.hint} /></Suspense> : shortcut.hint}
                    </span>
                  </span>
                  <ArrowIcon className={`${arrowSlideClass} shrink-0 text-blue-dark`} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}

async function TripOverview() {
  let result: { today: string; trip: ReturnType<typeof nextTrip> } | null = null;
  try {
    const [today, { data, error }] = await Promise.all([guestToday(), getMyBookings()]);
    if (error) console.error("Next trip read failed", error);
    else result = { today, trip: nextTrip(data ?? [], today) };
  } catch (error) {
    console.error("Next trip read failed", error);
  }
  const trip = result?.trip;
  const href = !result ? PAGE_ROUTES.MY_BOOKINGS : trip ? `${PAGE_ROUTES.MY_BOOKINGS}/${trip.id}` : PAGE_ROUTES.SEARCH;
  const action = !result ? "Open My Bookings" : trip ? (changeBlocker(trip, result!.today) ? "View booking" : "View or change booking") : "Browse stays";
  return (
    <Card padding="none" href={href} className="overflow-hidden">
      <div className="flex h-full">
        {trip ? <HotelPhoto url={trip.photoUrl} className="w-28 shrink-0 rounded-none object-cover" /> : result && (
          <div className="relative w-28 shrink-0">
            <Image src={POPULAR_DESTINATIONS.near[0].photo} alt="" fill sizes="112px" placeholder="blur" className="object-cover" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <h3 className="text-sm font-semibold text-blue-dark">{trip ? tripLabel(trip.checkIn, result!.today) : "Next trip"}</h3>
          <p className="mt-2 text-2xl font-semibold leading-8 text-ink [overflow-wrap:anywhere]">{trip ? trip.hotelName : result ? "Plan your first trip" : "Your trips"}</p>
          <p className="mt-2 text-sm leading-6 text-slate">{trip ? bookingSummary(trip) : result ? "When you book a stay, it shows up here." : "We couldn’t load your next trip just now."}</p>
          <span className={`${sectionLinkClass} mt-auto pt-5 text-sm`}>{action}<ArrowIcon className={arrowSlideClass} /></span>
        </div>
      </div>
    </Card>
  );
}

async function PointsOverview({ accountId }: { accountId: string }) {
  let balance: number | null = null;
  try {
    const result = await getPointsBalance(accountId);
    if (result.error) console.error("Points balance read failed", result.error);
    else balance = Number(result.balance);
  } catch (error) {
    console.error("Points balance read failed", error);
  }
  const { value, line } = pointsSummary(balance);
  return (
    <Card href={PAGE_ROUTES.REWARDS} padding="none" className="flex flex-col p-5">
      <h3 className="text-sm font-semibold text-blue-dark">Your points</h3>
      {value !== null && <p className="mt-2 text-[40px] font-bold leading-[48px] text-ink">{value}</p>}
      <p className="mt-2 text-sm leading-6 text-slate">{line}</p>
      <span className={`${sectionLinkClass} mt-auto pt-5 text-sm`}>See your rewards<ArrowIcon className={arrowSlideClass} /></span>
    </Card>
  );
}

async function UnreadHint({ fallback }: { fallback: string }) {
  let unread: number | null = null;
  try {
    const { messages, error } = await getInbox();
    if (!error) unread = unreadCount(messages);
    else console.error("Inbox read failed", error);
  } catch (error) {
    console.error("Inbox read failed", error);
  }
  return <>{inboxHint(unread, fallback)}</>;
}

function OverviewSkeleton() {
  return <div aria-hidden className="h-60 animate-pulse rounded-lg border border-edge bg-disabled motion-reduce:animate-none" />;
}
