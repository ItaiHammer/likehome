// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { hotelLocation, hotelPhoto, type ComparisonHotelRow } from './comparison.ts'

export const RECENTLY_VIEWED_CARDS = 9

export type HotelCard = {
  id: string
  name: string
  location: string
  photo: string | null
  href: string
  description?: string
  tags?: string[] | null
  priceFrom?: number | null
  maxCapacity?: number | null
  roomOptions?: number | null
}

type ViewedHotel = Pick<ComparisonHotelRow, 'id' | 'name' | 'city' | 'region' | 'country' | 'photo_urls' | 'liteapi_deleted_at' | 'tags'> & { description?: string | null; min_price?: number | string | null; max_capacity?: number | string | null; rooms?: { price_per_night?: number | string | null; capacity?: number | string | null }[] | null }

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
    const rooms = hotel.rooms ?? []
    const roomPrices = rooms.map((r) => Number(r.price_per_night)).filter((p) => Number.isFinite(p) && p > 0)
    const roomCapacities = rooms.map((r) => Number(r.capacity)).filter((c) => Number.isFinite(c) && c > 0)
    const price = Number(hotel.min_price) > 0 ? Number(hotel.min_price) : roomPrices.length ? Math.min(...roomPrices) : null
    const capacity = Number(hotel.max_capacity) > 0 ? Number(hotel.max_capacity) : roomCapacities.length ? Math.max(...roomCapacities) : null
    cards.push({
      id: hotel.id,
      name: hotel.name,
      location: hotelLocation(hotel),
      photo: hotelPhoto(hotel),
      href: `/reserve/${hotel.id}`,
      ...(hotel.description?.trim() ? { description: hotel.description.trim() } : {}),
      ...(hotel.tags?.length ? { tags: hotel.tags } : {}),
      ...(price !== null ? { priceFrom: price } : {}),
      ...(capacity !== null ? { maxCapacity: capacity } : {}),
      ...(rooms.length ? { roomOptions: rooms.length } : {}),
    })
  }
  return cards
}

// The history as getRecentlyViewedHotels reads it
export const toRecentlyViewedCards = (rows: unknown, limit = RECENTLY_VIEWED_CARDS) => toHotelCards(rows, limit)
