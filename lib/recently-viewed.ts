// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { hotelLocation, hotelPhoto, type ComparisonHotelRow } from './comparison.ts'

export const RECENTLY_VIEWED_CARDS = 4

export type RecentlyViewedCard = {
  id: string
  name: string
  location: string
  photo: string | null
  href: string
}

type ViewedHotel = Pick<ComparisonHotelRow, 'id' | 'name' | 'city' | 'region' | 'country' | 'photo_urls' | 'liteapi_deleted_at'>

// The history newest first, as getRecentlyViewedHotels reads it: one card per hotel, leaving out
// hotels that are gone or delisted (search hides those too)
export function toRecentlyViewedCards(rows: unknown, limit = RECENTLY_VIEWED_CARDS): RecentlyViewedCard[] {
  if (!Array.isArray(rows)) return []
  const seen = new Set<string>()
  const cards: RecentlyViewedCard[] = []
  for (const row of rows as ({ hotels?: ViewedHotel | null } | null)[]) {
    if (cards.length >= limit) break
    const hotel = row?.hotels
    if (!hotel?.id || hotel.liteapi_deleted_at || seen.has(hotel.id)) continue
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
