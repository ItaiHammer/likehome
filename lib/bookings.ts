// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { countNights, MAX_NIGHTS } from '../utils/reservation-logic.ts'

export type Booking = {
  id: string
  checkIn: string
  checkOut: string
  guests: number | null
  status: string
  hotelName: string
  city: string | null
  photoUrl: string | null
  roomType: string | null
  /** The hotel is gone or hidden from search, so the stay can't be booked again */
  unlisted?: boolean
}

// A stay that's under way (checked in, check-out still ahead) counts as upcoming
export function groupBookings(bookings: Booking[], today: string) {
  const upcoming: Booking[] = []
  const past: Booking[] = []
  const cancelled: Booking[] = []
  for (const booking of bookings) {
    if (booking.status === 'cancelled') cancelled.push(booking)
    else if (booking.status !== 'completed' && booking.checkOut > today) upcoming.push(booking)
    else past.push(booking)
  }
  upcoming.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  past.sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  cancelled.sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  return { upcoming, past, cancelled }
}

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function formatStayDates(checkIn: string, checkOut: string): string {
  const start = new Date(`${checkIn}T00:00:00Z`)
  const end = new Date(`${checkOut}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${checkIn} - ${checkOut}`

  const year = end.getUTCFullYear()
  if (start.getUTCFullYear() !== year) {
    return `${monthDay.format(start)}, ${start.getUTCFullYear()} - ${monthDay.format(end)}, ${year}`
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${monthDay.format(start)} - ${monthDay.format(end)}, ${year}`
  }
  return `${monthDay.format(start)} - ${end.getUTCDate()}, ${year}`
}

// There's no booking-code column yet, so the code is derived from the reservation id
export function bookingCode(id: string): string {
  return `LH-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export function bookingSummary(booking: Booking): string {
  const guests = booking.guests ? `${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}` : null
  return [formatStayDates(booking.checkIn, booking.checkOut), booking.roomType, guests].filter(Boolean).join(' · ')
}

// Whole dollars stay whole ($756); anything with cents shows both digits ($1,234.50)
export const money = (n: number) => {
  const cents = Math.round(n * 100) / 100
  return `$${cents.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(cents) ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** What cancelling would cost right now (get_cancellation_quote). Insured: what was paid comes back as points. */
export type CancellationQuote = {
  hasInsurance: boolean
  canCancel: boolean
  bookingPaid: number
  insurancePaid: number
  refund: number
  refundPoints: number
}

const amount = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// Postgres numerics can arrive as strings, so every amount goes through Number()
export function toCancellationQuote(row: unknown): CancellationQuote | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  return {
    hasInsurance: r.has_insurance === true,
    canCancel: r.can_cancel === true,
    bookingPaid: amount(r.booking_paid),
    insurancePaid: amount(r.insurance_paid),
    refund: amount(r.refund),
    refundPoints: amount(r.refund_points),
  }
}

/** One of the guest's confirmed bookings at another hotel. The database refuses a stay that overlaps one. */
export type OtherStay = { checkIn: string; checkOut: string; hotelName: string }

// Check-out day is free, so back-to-back stays don't overlap
export function findOverlap(stays: OtherStay[], checkIn: string, checkOut: string): OtherStay | null {
  return stays.find((s) => s.checkIn < checkOut && s.checkOut > checkIn) ?? null
}

export function overlapMessage(stay: OtherStay): string {
  return `You already have a booking at ${stay.hotelName} for ${formatStayDates(stay.checkIn, stay.checkOut)}. Pick dates that don’t overlap it.`
}

// The date rules the reservation APIs check (validateReservationInput), in the guest's words so they
// show before saving. `today` should come from todayInTimeZone(browserTimeZone()).
export function datesProblem(checkIn: string, checkOut: string, today: string): string | null {
  const nights = countNights(checkIn, checkOut)
  if (nights <= 0) return 'Pick your new check-in and check-out dates.'
  if (nights > MAX_NIGHTS) return `Stays can be up to ${MAX_NIGHTS} nights.`
  if (checkIn < today) return 'That check-in date is too soon. Pick a later date.'
  return null
}

export const TOO_CLOSE_TO_CHANGE = 'It’s too close to check-in to change this booking online.'

// Mirrors PATCH /api/reservations/[id], which refuses once check-in day has come in the guest's
// time zone (`today` here should come from todayInTimeZone / guestToday).
// Returns why a booking can't be changed, or null if it can.
export function changeBlocker(booking: { status: string; checkIn: string; checkOut: string }, today: string): string | null {
  if (booking.status === 'cancelled') return 'This booking was cancelled, so it can’t be changed.'
  if (booking.status === 'completed' || booking.checkOut < today) return 'This stay is over, so it can’t be changed.'
  if (booking.checkIn < today) return 'Your stay has started, so it can’t be changed online.'
  if (booking.checkIn === today) return TOO_CLOSE_TO_CHANGE
  return null
}

export function firstName(fullName: string | null | undefined): string | null {
  return fullName?.trim().split(/\s+/)[0] || null
}

export function initials(fullName: string | null | undefined, email: string | null | undefined): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return (words[0]?.[0] ?? email?.trim()[0] ?? '?').toUpperCase()
}
