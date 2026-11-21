// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The personal homepage's summary cards: next trip, points and unread messages.
import { groupBookings, money, type Booking } from './bookings.ts'
import { countNights } from '../utils/reservation-logic.ts'

// The soonest stay My Bookings lists as upcoming (a stay under way counts), if it's confirmed
export function nextTrip(bookings: Booking[], today: string): Booking | null {
  return groupBookings(bookings, today).upcoming.find((b) => b.status === 'confirmed') ?? null
}

export function tripLabel(checkIn: string, today: string): string {
  if (checkIn < today) return 'Staying now'
  const days = countNights(today, checkIn)
  return `Next trip · ${days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`}`
}

// The database's rule (points_to_dollars in supabase/migrations): 100 points = $1
export const POINTS_PER_DOLLAR = 100

/** `balance` is null when the read failed */
export function pointsSummary(balance: number | null): { value: string | null; line: string } {
  if (balance === null) return { value: null, line: 'We couldn’t load your points just now.' }
  const points = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0
  if (points === 0) return { value: '0', line: 'Earn points on every night you book.' }
  return { value: points.toLocaleString('en-US'), line: `Worth ${money(points / POINTS_PER_DOLLAR)} toward a stay` }
}

/** `unread` is null when the inbox read failed */
export function inboxHint(unread: number | null, fallback: string): string {
  if (unread === null || !Number.isFinite(unread)) return fallback
  const n = Math.max(0, Math.floor(unread))
  return n === 0 ? 'No new messages' : `${n.toLocaleString('en-US')} unread from your hotels`
}
