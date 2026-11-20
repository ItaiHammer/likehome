import { HotelPhoto } from "@/app/MyBookings/_components/HotelPhoto";
import { Card, SectionHeading, swipeItemClass, swipeRowClass } from "@/app/_components/ui";
import { RECENTLY_VIEWED_CARDS, toRecentlyViewedCards } from "@/lib/recently-viewed";
import { getRecentlyViewedHotels } from "@/utils/recently-viewed";

const TITLE_ID = "recently-viewed-title";

// The hotels a personal account opened last (recorded by the hotel page). An optional section: with no
// history, or a failed read, it shows nothing at all
export async function RecentlyViewed({ accountId }: { accountId: string }) {
  let result: Awaited<ReturnType<typeof getRecentlyViewedHotels>>;
  try {
    // More than it shows, so delisted hotels can be skipped
    result = await getRecentlyViewedHotels(accountId, RECENTLY_VIEWED_CARDS * 3);
  } catch (error) {
    console.error("Recently viewed failed", error);
    return null;
  }
  if (result.error) {
    console.error("Recently viewed read failed", result.error);
    return null;
  }

  const cards = toRecentlyViewedCards(result.data);
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby={TITLE_ID}>
      <SectionHeading id={TITLE_ID} title="Recently viewed" subtitle="Pick up where you left off." />
      {/* On phones the padding keeps a focused card's ring and the entrance slide inside the scroll box, and the margin takes it back */}
      <ul className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${swipeRowClass()} max-sm:-mb-3 max-sm:mt-5 max-sm:pb-3 max-sm:pt-1`}>
        {cards.map((hotel, i) => (
          <li key={hotel.id} className={`card-in grid ${swipeItemClass} max-sm:w-[240px]`} style={{ "--i": i } as React.CSSProperties}>
            <Card href={hotel.href} padding="none" className="overflow-hidden">
              <HotelPhoto url={hotel.photo} className="aspect-[16/10] w-full rounded-none" />
              <div className="px-5 py-4 sm:px-4 sm:py-3">
                <h3 className="truncate font-serif text-xl leading-7 text-ink">{hotel.name}</h3>
                {hotel.location && <p className="truncate text-sm leading-6 text-slate">{hotel.location}</p>}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
