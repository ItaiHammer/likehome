// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { hotelLocation, hotelPhoto, type ComparisonHotelRow } from './comparison.ts'

export const RECENTLY_VIEWED_CARDS = 4

export type HotelCard = {
  id: string
  name: string
  location: string
  photo: string | null
  href: string
}

type ViewedHotel = Pick<ComparisonHotelRow, 'id' | 'name' | 'city' | 'region' | 'country' | 'photo_urls' | 'liteapi_deleted_at'>

// False for a hotel that is gone or delisted (search hides those too)
export function isListedHotel<T extends { id?: string | null; liteapi_deleted_at?: string | null }>(
  hotel: T | null | undefined,
): hotel is T {
  return Boolean(hotel?.id && !hotel.liteapi_deleted_at)
}

// Rows that each carry a hotel (the history or the favorites, newest first): one card per listed hotel
export function toHotelCards(rows: unknown, limit: number): HotelCard[] {
  if (!Array.isArray(rows)) return []
  const seen = new Set<string>()
  const cards: HotelCard[] = []
  for (const row of rows as ({ hotels?: ViewedHotel | null } | null)[]) {
    if (cards.length >= limit) break
    const hotel = row?.hotels
    if (!isListedHotel(hotel) || seen.has(hotel.id)) continue
    seen.add(hotel.id)
    cards.push({
      id: hotel.id,
      name: hotel.name,
      location: hotelLocation(hotel),
      photo: hotelPhoto(hotel),
      href: `/reserve/${hotel.id}`,
    })
  }
  return cards
}

// The history as getRecentlyViewedHotels reads it
export const toRecentlyViewedCards = (rows: unknown, limit = RECENTLY_VIEWED_CARDS) => toHotelCards(rows, limit)
