import Link from "next/link";
import { ArrowIcon, arrowSlideClass, sectionLinkClass } from "@/app/_components/ui";
import { calendarHref, calendarProperties, calendarStays } from "@/lib/owner-calendar";
import { guestToday } from "@/utils/guest-today";
import { loadOwnerHistory, loadOwnerListings } from "./owner-history";
import { blockFrame, pulse } from "./styles";
import { WeekCard } from "./WeekCard";

const TITLE = "This week";
const TITLE_ID = "owner-week-title";

async function loadWeek(ownerId: string) {
  try {
    const [listings, history, today] = await Promise.all([loadOwnerListings(ownerId), loadOwnerHistory(), guestToday()]);
    if (!listings || !history) return null;
    return { properties: calendarProperties(listings), stays: calendarStays(history.bookings), today };
  } catch (error) {
    console.error("This week failed", error);
    return null;
  }
}

function Frame({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <section aria-labelledby={TITLE_ID} aria-busy={busy || undefined} className={`${blockFrame} sm:py-7`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={TITLE_ID} className="font-serif text-[32px] leading-10 text-ink">
          {TITLE}
        </h2>
        <Link href={calendarHref()} className={sectionLinkClass}>
          Open calendar
          <ArrowIcon className={arrowSlideClass} />
        </Link>
      </div>
      {children}
    </section>
  );
}

// Rooms booked each night for the next seven days, and who is there on the picked day. Hidden with no listings or a failed read.
export async function OwnerWeek({ ownerId }: { ownerId: string }) {
  const week = await loadWeek(ownerId);
  if (!week || week.properties.length === 0) return null;
  return (
    <Frame>
      <WeekCard {...week} />
    </Frame>
  );
}

export function OwnerWeekSkeleton() {
  return (
    <Frame busy>
      <div aria-hidden className={`mt-6 h-36 ${pulse}`} />
    </Frame>
  );
}
