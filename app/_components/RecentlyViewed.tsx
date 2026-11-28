import { HotelCardRow } from "@/app/_components/HotelCardRow";
import { RECENTLY_VIEWED_CARDS, toRecentlyViewedCards } from "@/lib/recently-viewed";
import { getRecentlyViewedHotels } from "@/utils/recently-viewed";

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

  return <HotelCardRow titleId="recently-viewed-title" title="Recently viewed" subtitle="Pick up where you left off." cards={cards} carousel showFavorites />;
}
