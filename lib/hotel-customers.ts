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
