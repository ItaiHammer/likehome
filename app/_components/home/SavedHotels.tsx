import { toSavedHotelCards } from "@/lib/saved-hotel-cards";
import { getFavoriteHotels } from "@/utils/favorite-hotels";
import { SavedHotelsRow } from "./SavedHotelsRow";

// A personal account's newest saved hotels. Like Recently viewed it is optional: with nothing saved, or a
// failed read, it shows nothing at all
export async function SavedHotels({ accountId }: { accountId: string }) {
  let result: Awaited<ReturnType<typeof getFavoriteHotels>>;
  try {
    result = await getFavoriteHotels(accountId);
  } catch (error) {
    console.error("Saved hotels failed", error);
    return null;
  }
  if (result.error) {
    console.error("Saved hotels read failed", result.error);
    return null;
  }

  const saved = toSavedHotelCards(result.data);
  if (saved.cards.length === 0) return null;
  return <SavedHotelsRow saved={saved} />;
}
