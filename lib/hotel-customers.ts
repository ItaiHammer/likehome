// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { bookingCode } from './bookings.ts'

type Numeric = number | string

export type BookingStage = 'upcoming' | 'in-stay' | 'past' | 'cancelled'

// One row of get_hotel_booking_history (supabase/migrations/hotel_booking_history.sql), which decides the stage,
// hides failed checkouts and leaves insurance out of amount_paid
export type HotelBookingRow = {
  reservation_id: string
  hotel_id: string
  hotel_name: string
  room_id: string | null
  room_type: string | null
  guest_id: string
  guest_name: string | null
  guest_email: string | null
  check_in: string
  check_out: string
  nights: number
  guests: number | null
  children: number
  status: string | null
  stage: BookingStage
  total_price: Numeric | null
  has_insurance: boolean | null
  cancelled_at: string | null
  cancellation_fee: Numeric | null
  amount_paid: Numeric
  amount_refunded: Numeric
  booked_at: string
}

export type HotelBooking = {
  id: string
  code: string
  hotelId: string
  hotelName: string
  roomType: string | null
  guestId: string
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

function toHotelBooking(row: HotelBookingRow): HotelBooking {
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
    stage: row.stage,
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
export function toHotelBookings(rows: HotelBookingRow[]): HotelBooking[] {
  return rows.map(toHotelBooking)
}

// One row of get_hotel_customer_history: per-guest totals over the booking rows, newest check-in first
export type HotelCustomerRow = {
  guest_id: string
  guest_name: string | null
  guest_email: string | null
  total_bookings: Numeric
  cancelled_bookings: Numeric
  upcoming_bookings: Numeric
  nights_stayed: Numeric
  total_paid: Numeric
  first_stay: string | null
  last_stay: string | null
  next_stay: string | null
  is_repeat: boolean
  hotel_names: string[]
}

export type HotelCustomer = {
  id: string
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

function toHotelCustomer(row: HotelCustomerRow): HotelCustomer {
  return {
    id: row.guest_id,
    name: row.guest_name,
    email: row.guest_email,
    bookings: Number(row.total_bookings),
    cancelled: Number(row.cancelled_bookings),
    upcoming: Number(row.upcoming_bookings),
    nightsStayed: Number(row.nights_stayed),
    totalSpent: Number(row.total_paid),
    firstStay: row.first_stay,
    lastStay: row.last_stay,
    nextStay: row.next_stay,
    isRepeat: row.is_repeat,
    listings: row.hotel_names,
  }
}

// Keeps the RPC's order
export function toHotelCustomers(rows: HotelCustomerRow[]): HotelCustomer[] {
  return rows.map(toHotelCustomer)
}

// Adding prices like 0.1 + 0.2 drifts; round to cents
const cents = (n: number) => Math.round(n * 100) / 100

// Adds up the customers, so the totals can't disagree with them
export function summarizeOwner(customers: HotelCustomer[]): OwnerSummary {
  const total = (pick: (c: HotelCustomer) => number) => customers.reduce((sum, c) => sum + pick(c), 0)
  return {
    customers: customers.length,
    repeatCustomers: customers.filter((c) => c.isRepeat).length,
    bookings: total((c) => c.bookings),
    upcoming: total((c) => c.upcoming),
    cancelled: total((c) => c.cancelled),
    revenue: cents(total((c) => c.totalSpent)),
  }
}

// The whole response; `listings` feeds the property picker, so it includes listings with no bookings
export function toHotelCustomerHistory(
  bookingRows: HotelBookingRow[],
  customerRows: HotelCustomerRow[],
  listings: OwnerListing[],
): HotelCustomerHistory {
  const customers = toHotelCustomers(customerRows)
  return {
    listings: listings.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    summary: summarizeOwner(customers),
    customers,
    bookings: toHotelBookings(bookingRows),
  }
}
