// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { toHotelCards, type HotelCard } from './recently-viewed.ts'

export const SAVED_HOTEL_CARDS = 3

export type SavedHotelCards = { cards: HotelCard[]; total: number }

// The favorites as getFavoriteHotels reads them, newest first. Every one is kept (it's one traveler's
// short list), so a hotel un-hearted on the homepage always makes room for the next
export function toSavedHotelCards(rows: unknown): SavedHotelCards {
  const all = toHotelCards(rows, Infinity)
  return { cards: all, total: all.length }
}

// What the row shows once the hearts are known: savedIds is null until the list loads (or if it can't)
export function shownSavedHotels({ cards, total }: SavedHotelCards, savedIds: ReadonlySet<string> | null) {
  const kept = savedIds ? cards.filter((card) => savedIds.has(card.id)) : cards
  const left = total - (cards.length - kept.length)
  return { cards: kept.slice(0, SAVED_HOTEL_CARDS), more: left > SAVED_HOTEL_CARDS }
}
