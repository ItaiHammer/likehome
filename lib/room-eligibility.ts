import { roomFits } from './stay-filters.ts'

type RoomCapacity = {
  sleeps: number
  maxAdults?: number | null
  maxChildren?: number | null
  soldOut?: boolean
}

/** Selection eligibility is independent of whether a room was sold out. */
export function roomOptionEligibility(room: RoomCapacity, party: { adults: number; children: number }) {
  const tooSmall = !roomFits(room, party.adults + party.children, party.adults, party.children)
  return { tooSmall, disabled: tooSmall || !!room.soldOut }
}

/** Unlike an individual room's capacity, this is the largest party the hotel's rooms can hold. */
export function exceedsHotelGuestLimit(adults: number, children: number, maxGuests?: number): boolean {
  return maxGuests !== undefined && adults + children > maxGuests
}
