// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The stay page lists amenities by search_hotels' rule, a tag on the hotel or on any of its rooms, so
// every stay a filter finds shows that amenity.
import { propertyAmenities, roomAmenities, travelerTypes } from '../app/search/types.ts'
import type { Offer } from '../app/_data/stays.ts'

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
