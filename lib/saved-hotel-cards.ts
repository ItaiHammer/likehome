// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { toHotelCards, type HotelCard } from './recently-viewed.ts'

export const SAVED_HOTEL_CARDS = 3

export type SavedHotelCards = { cards: HotelCard[]; more: boolean }

// The favorites as getFavoriteHotels reads them, newest first: the row's cards, and whether more are saved
export function toSavedHotelCards(rows: unknown): SavedHotelCards {
  const all = toHotelCards(rows, SAVED_HOTEL_CARDS + 1)
  return { cards: all.slice(0, SAVED_HOTEL_CARDS), more: all.length > SAVED_HOTEL_CARDS }
}
