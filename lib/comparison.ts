// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { propertyAmenities, roomAmenities } from '../app/search/types.ts'
import { stayOffers } from './stay-filters.ts'

export type AmenityStatus = 'available' | 'some-rooms' | 'not-offered'

export type ComparisonListing = {
  id: string
  name: string
  location: string
  photo: string | null
  rating: number | null
  priceFrom: number
  sleepsUpTo: number
  amenities: { label: string; status: AmenityStatus }[]
  goodFor: string[]
  viewedAt: string | null
}

export type ComparisonRoomRow = {
  price_per_night: number | string
  capacity: number | null
  tags: string[] | null
}

export type ComparisonHotelRow = {
  id: string
  name: string
  city: string | null
  region: string | null
  country: string | null
  photo_urls: string[] | null
  rating: number | string | null
  tags: string[] | null
  liteapi_deleted_at: string | null
  rooms: ComparisonRoomRow[] | null
}

// The current stay plus up to 2 recently viewed ones
export const MAX_COMPARED = 3

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Null when the hotel page would 404 for it: missing, delisted, or no rooms
export function toComparisonListing(hotel: ComparisonHotelRow | null, viewedAt: string | null = null): ComparisonListing | null {
  const rooms = hotel?.rooms ?? []
  if (!hotel || hotel.liteapi_deleted_at || rooms.length === 0) return null

  const { offers, goodFor } = stayOffers(hotel.tags ?? [], rooms.map((r) => r.tags))
  const status = (label: string): AmenityStatus => {
    const offer = offers.find((o) => o.label === label)
    if (!offer) return 'not-offered'
    return offer.someRooms ? 'some-rooms' : 'available'
  }
  const rating = hotel.rating === null ? null : Number(hotel.rating)

  return {
    id: hotel.id,
    name: hotel.name,
    location: [hotel.city, hotel.region, hotel.country].filter(Boolean).join(', '),
    photo: hotel.photo_urls?.find(Boolean) ?? null,
    rating: Number.isFinite(rating) ? rating : null,
    priceFrom: Math.min(...rooms.map((r) => Number(r.price_per_night))),
    sleepsUpTo: Math.max(...rooms.map((r) => r.capacity ?? 2)),
    amenities: [...propertyAmenities, ...roomAmenities].map((label) => ({ label, status: status(label) })),
    goodFor,
    viewedAt,
  }
}

export function comparisonIds(ids: string[]): string[] {
  const valid = ids.filter((id) => UUID.test(id)).map((id) => id.toLowerCase())
  return [...new Set(valid)].slice(0, MAX_COMPARED)
}

export function inIdOrder(listings: ComparisonListing[], ids: string[]): ComparisonListing[] {
  const byId = new Map(listings.map((l) => [l.id, l]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}
