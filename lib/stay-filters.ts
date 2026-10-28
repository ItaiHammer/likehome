// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The stay page applies the search filters the way search_hotels does, so a stay found by a filter
// always shows what matched: a room passes when it fits the guests, price, beds and bed size, and
// every chosen tag is on the hotel or on that same room.
import { bedSizes, propertyAmenities, roomAmenities, tags as filterTags, travelerTypes } from '../app/search/types.ts'
import type { Offer } from '../app/_data/stays.ts'

// The search's own keys, carried from a search result to the stay page and back to the same search
// (tz too, so date checks keep using the guest's "today" after the round trip)
const SEARCH_KEYS = ['where', 'place', 'checkIn', 'checkOut', 'adults', 'children', 'minPrice', 'maxPrice', 'minRating', 'numBeds', 'bedSize', 'tags', 'sort', 'page', 'tz']

type Params = Record<string, string | string[] | undefined>

export function searchQuery(params: Params): string {
  const query = new URLSearchParams()
  for (const key of SEARCH_KEYS) {
    for (const value of [params[key] ?? []].flat()) if (value) query.append(key, value)
  }
  return query.toString()
}

// The search a stay was opened from. Through sign-in it rides along as `from`, since the card's own
// guests and dates replace the top-level keys.
export function originalSearch(params: Params): string {
  if (typeof params.from !== 'string') return searchQuery(params)
  const from = new URLSearchParams(params.from)
  return searchQuery(Object.fromEntries([...new Set(from.keys())].map((key) => [key, from.getAll(key)])))
}

export type RoomFilters = { guests: number; adults?: number; children?: number; minPrice?: number; maxPrice?: number; numBeds?: number; bedSize?: string; tags: string[] }

type FilterableRoom = { nightly: number; sleeps: number; maxAdults?: number | null; maxChildren?: number | null; soldOut?: boolean; beds?: number; bedSize?: string | null; tags?: string[] }

// Values the search itself would ignore (a typo'd price, an unknown tag) don't narrow the rooms either.
// `party` is the adults and children the search was sent, so the page checks the same per-room limits.
export function readRoomFilters(params: Params, guests: number, party?: Pick<RoomFilters, 'adults' | 'children'>): RoomFilters {
  const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined)
  const amount = (key: string) => {
    const v = one(key)?.trim()
    return v && /^\d+(\.\d+)?$/.test(v) ? Number(v) : undefined
  }
  const beds = one('numBeds')
  const bedSize = one('bedSize')
  // Like the search, a reversed range (min above max) means no price filter at all
  const [minPrice, maxPrice] = [amount('minPrice'), amount('maxPrice')]
  const reversed = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice
  return {
    guests,
    ...party,
    minPrice: reversed ? undefined : minPrice,
    maxPrice: reversed ? undefined : maxPrice,
    numBeds: beds && /^[1-9]\d*$/.test(beds) ? Number(beds) : undefined,
    bedSize: (bedSizes as readonly string[]).includes(bedSize ?? '') ? bedSize : undefined,
    tags: [params.tags ?? []].flat().filter((t) => (filterTags as readonly string[]).includes(t)),
  }
}

/** Whether the room holds these guests, by its own limits where it has them */
export const roomFits = (r: FilterableRoom, guests: number, adults?: number, children?: number) =>
  r.sleeps >= guests &&
  (adults === undefined || r.maxAdults == null || r.maxAdults >= adults) &&
  (children === undefined || r.maxChildren == null || r.maxChildren >= children)

/** The cheapest open room that passes the filters, or null when none does */
export function matchingRoom<R extends FilterableRoom>(rooms: R[], hotelTags: string[], f: RoomFilters): R | null {
  const passes = (r: R) =>
    !r.soldOut &&
    roomFits(r, f.guests, f.adults, f.children) &&
    (f.minPrice === undefined || r.nightly >= f.minPrice) &&
    (f.maxPrice === undefined || r.nightly <= f.maxPrice) &&
    (f.numBeds === undefined || (r.beds ?? 1) >= f.numBeds) &&
    (f.bedSize === undefined || r.bedSize === f.bedSize) &&
    f.tags.every((t) => hotelTags.includes(t) || !!r.tags?.includes(t))
  return [...rooms].sort((a, b) => a.nightly - b.nightly).find(passes) ?? null
}

/** A room's own amenities, in the filters' order */
export function roomAmenityList(tags: string[] | null | undefined): string[] {
  return roomAmenities.filter((t) => !!tags?.includes(t))
}

/** What a stay offers: every filter tag on the hotel or any of its rooms, in the filters' order and with their names */
export function stayOffers(hotelTags: string[], roomTags: (string[] | null | undefined)[]): { offers: Offer[]; goodFor: string[] } {
  const offer = (tag: string): Offer | null => {
    if (hotelTags.includes(tag)) return { label: tag }
    const withTag = roomTags.filter((t) => t?.includes(tag)).length
    return withTag === 0 ? null : { label: tag, someRooms: withTag < roomTags.length }
  }
  return {
    offers: [...propertyAmenities, ...roomAmenities].map(offer).filter((o): o is Offer => o !== null),
    goodFor: travelerTypes.filter((t) => offer(t) !== null),
  }
}
