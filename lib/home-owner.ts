// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The business homepage's guests card and stat tiles, from the owner's customer and booking history.
import { formatStayDates, money } from './bookings.ts'
import type { HotelBooking, OwnerSummary } from './hotel-customers.ts'
import { formatShort } from '../app/_components/dates.ts'

export const GUESTS_SHOWN = 3

type GuestRow = { id: string; guest: string; stay: string; dates: string }

export type GuestList = { rows: GuestRow[]; more: number }

// "Elena Kowalski" → "Elena K.": enough for the owner to recognise, without the full name on the homepage
export function shortGuestName(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'Guest'
  if (words.length === 1) return words[0]
  return `${words[0]} ${[...words[words.length - 1]][0].toUpperCase()}.`
}

const stayOf = (b: HotelBooking) => [b.roomType, b.hotelName].filter(Boolean).join(' · ')

function list(bookings: HotelBooking[], dates: (b: HotelBooking) => string): GuestList {
  return {
    rows: bookings.slice(0, GUESTS_SHOWN).map((b) => ({ id: b.id, guest: shortGuestName(b.guestName), stay: stayOf(b), dates: dates(b) })),
    more: Math.max(0, bookings.length - GUESTS_SHOWN),
  }
}

const byCheckIn = (a: HotelBooking, b: HotelBooking) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut)

/** Who is staying now (leaving soonest first) and who arrives next (soonest first) */
export function ownerGuests(bookings: HotelBooking[]): { staying: GuestList; arriving: GuestList } {
  const staying = bookings.filter((b) => b.stage === 'in-stay').sort((a, b) => a.checkOut.localeCompare(b.checkOut))
  const arriving = bookings.filter((b) => b.stage === 'upcoming').sort(byCheckIn)
  return {
    staying: list(staying, (b) => `until ${formatShort(b.checkOut)}`),
    arriving: list(arriving, (b) => formatStayDates(b.checkIn, b.checkOut)),
  }
}

type OwnerStat = { label: string; value: string; detail: string }

const count = (n: number) => n.toLocaleString('en-US')

export function ownerStats(summary: OwnerSummary, bookings: HotelBooking[]): OwnerStat[] {
  const next = bookings.filter((b) => b.stage === 'upcoming').sort(byCheckIn)[0]
  return [
    { label: 'Paid to you', value: money(summary.revenue), detail: 'after refunds' },
    { label: 'Bookings', value: count(summary.bookings), detail: `${count(summary.cancelled)} cancelled` },
    { label: 'Upcoming stays', value: count(summary.upcoming), detail: next ? `Next check-in ${formatShort(next.checkIn)}` : 'None yet' },
    { label: 'Guests', value: count(summary.customers), detail: `${count(summary.repeatCustomers)} booked more than once` },
  ]
}

export function statsSubtitle(listings: number): string {
  return listings === 1 ? 'For your property, since you listed it.' : `Across your ${count(listings)} properties, since you listed them.`
}
