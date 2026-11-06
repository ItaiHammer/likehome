// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { bookingCode } from './bookings.ts'

type Numeric = number | string

// One row of get_hotel_booking_history (supabase/migrations/hotel_booking_history.sql)
export type HotelBookingRow = {
  reservation_id: string
  hotel_id: string
  hotel_name: string
  room_id: string | null
  room_type: string | null
  guest_id: string | null
  guest_name: string | null
  guest_email: string | null
  check_in: string
  check_out: string
  nights: number
  guests: number | null
  children: number
  status: string | null
  total_price: Numeric | null
  has_insurance: boolean | null
  cancelled_at: string | null
  cancellation_fee: Numeric | null
  amount_paid: Numeric
  amount_refunded: Numeric
  booked_at: string
}

export type BookingStage = 'upcoming' | 'in-stay' | 'past' | 'cancelled'

export type HotelBooking = {
  id: string
  code: string
  hotelId: string
  hotelName: string
  roomType: string | null
  guestId: string | null
  guestName: string | null
  guestEmail: string | null
  checkIn: string
  checkOut: string
  nights: number
  guests: number | null
  children: number
  stage: BookingStage
  totalPrice: number
  amountPaid: number
  amountRefunded: number
  cancellationFee: number | null
  hasInsurance: boolean
  bookedAt: string
  cancelledAt: string | null
}

const toNumber = (n: Numeric | null) => (n === null ? 0 : Number(n))

// Same rules as groupBookings in lib/bookings.ts; check-out day is past, check-in day is in-stay
export function bookingStage(
  row: Pick<HotelBookingRow, 'status' | 'check_in' | 'check_out'>,
  today: string,
): BookingStage {
  if (row.status === 'cancelled') return 'cancelled'
  if (row.status === 'completed' || row.check_out <= today) return 'past'
  if (row.check_in <= today) return 'in-stay'
  return 'upcoming'
}

// Checkout's undo cancels an unpaid booking without a fee; a real cancellation always sets one
export function isUnpaidCheckoutFailure(
  row: Pick<HotelBookingRow, 'status' | 'cancellation_fee' | 'amount_paid'>,
): boolean {
  return row.status === 'cancelled' && row.cancellation_fee === null && toNumber(row.amount_paid) === 0
}

function toHotelBooking(row: HotelBookingRow, today: string): HotelBooking {
  return {
    id: row.reservation_id,
    code: bookingCode(row.reservation_id),
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    roomType: row.room_type,
    guestId: row.guest_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    guests: row.guests,
    children: row.children,
    stage: bookingStage(row, today),
    totalPrice: toNumber(row.total_price),
    amountPaid: toNumber(row.amount_paid),
    amountRefunded: toNumber(row.amount_refunded),
    cancellationFee: row.cancellation_fee === null ? null : Number(row.cancellation_fee),
    hasInsurance: !!row.has_insurance,
    bookedAt: row.booked_at,
    cancelledAt: row.cancelled_at,
  }
}

// Keeps the RPC's order (check-in, newest first)
export function toHotelBookings(rows: HotelBookingRow[], today: string): HotelBooking[] {
  return rows.filter((row) => !isUnpaidCheckoutFailure(row)).map((row) => toHotelBooking(row, today))
}

export type HotelCustomer = {
  id: string | null
  name: string | null
  email: string | null
  bookings: number
  cancelled: number
  upcoming: number
  nightsStayed: number
  totalSpent: number
  firstStay: string | null
  lastStay: string | null
  nextStay: string | null
  isRepeat: boolean
  listings: string[]
}

export type OwnerSummary = {
  customers: number
  repeatCustomers: number
  bookings: number
  upcoming: number
  cancelled: number
  revenue: number
}

export type OwnerListing = { id: string; name: string }

export type HotelCustomerHistory = {
  listings: OwnerListing[]
  summary: OwnerSummary
  customers: HotelCustomer[]
  bookings: HotelBooking[]
}

// Adding prices like 0.1 + 0.2 drifts; round to cents
const cents = (n: number) => Math.round(n * 100) / 100
const spent = (bookings: HotelBooking[]) => cents(bookings.reduce((sum, b) => sum + b.amountPaid - b.amountRefunded, 0))
const stayed = (b: HotelBooking) => b.stage === 'past' || b.stage === 'in-stay'

function earliest(dates: string[]): string | null {
  return dates.length ? dates.reduce((a, b) => (b < a ? b : a)) : null
}

function latest(dates: string[]): string | null {
  return dates.length ? dates.reduce((a, b) => (b > a ? b : a)) : null
}

function toCustomer(bookings: HotelBooking[]): HotelCustomer {
  const kept = bookings.filter((b) => b.stage !== 'cancelled')
  return {
    id: bookings[0].guestId,
    name: bookings.find((b) => b.guestName)?.guestName ?? null,
    email: bookings.find((b) => b.guestEmail)?.guestEmail ?? null,
    bookings: bookings.length,
    cancelled: bookings.length - kept.length,
    upcoming: bookings.filter((b) => b.stage === 'upcoming').length,
    nightsStayed: bookings.filter(stayed).reduce((sum, b) => sum + b.nights, 0),
    totalSpent: spent(bookings),
    firstStay: earliest(kept.map((b) => b.checkIn)),
    lastStay: latest(bookings.filter(stayed).map((b) => b.checkIn)),
    nextStay: earliest(bookings.filter((b) => b.stage === 'upcoming').map((b) => b.checkIn)),
    isRepeat: kept.length >= 2,
    listings: [...new Set(bookings.map((b) => b.hotelName))].sort(),
  }
}

// Bookings whose account is gone (guestId null) become one entry; newest check-in first
export function summarizeCustomers(bookings: HotelBooking[]): HotelCustomer[] {
  const byGuest = new Map<string | null, HotelBooking[]>()
  for (const booking of bookings) {
    byGuest.set(booking.guestId, [...(byGuest.get(booking.guestId) ?? []), booking])
  }
  const lastCheckIn = (group: HotelBooking[]) => latest(group.map((b) => b.checkIn)) ?? ''
  return [...byGuest.values()]
    .sort((a, b) => lastCheckIn(b).localeCompare(lastCheckIn(a)))
    .map(toCustomer)
}

export function summarizeOwner(bookings: HotelBooking[], customers: HotelCustomer[]): OwnerSummary {
  return {
    customers: customers.length,
    repeatCustomers: customers.filter((c) => c.isRepeat).length,
    bookings: bookings.length,
    upcoming: bookings.filter((b) => b.stage === 'upcoming').length,
    cancelled: bookings.filter((b) => b.stage === 'cancelled').length,
    revenue: spent(bookings),
  }
}

// The whole response; `listings` feeds the property picker, so it includes listings with no bookings
export function toHotelCustomerHistory(rows: HotelBookingRow[], listings: OwnerListing[], today: string): HotelCustomerHistory {
  const bookings = toHotelBookings(rows, today)
  const customers = summarizeCustomers(bookings)
  return {
    listings: listings.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    summary: summarizeOwner(bookings, customers),
    customers,
    bookings,
  }
}
