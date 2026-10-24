import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// check_in / check_out are timestamptz in the db, so reads come back like "2099-01-01T00:00:00+00:00".
// The rest of the app (validation, pricing, UI) works with YYYY-MM-DD, so reads are normalized to that.
function toDateOnly(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10)
}

function normalizeReservationDates<T extends { check_in?: string; check_out?: string }>(
  reservation: T
): T {
  return {
    ...reservation,
    ...(reservation.check_in ? { check_in: toDateOnly(reservation.check_in) } : {}),
    ...(reservation.check_out ? { check_out: toDateOnly(reservation.check_out) } : {}),
  }
}

export async function getReservationsByAccount(accountId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('account_id', accountId)
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function getReservationsByHotel(hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('hotel_id', hotelId)
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function getReservationsByRoom(roomId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('room_id', roomId)
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function getReservation(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data ? normalizeReservationDates(data) : data, error }
}

export async function createReservation(reservation: {
  account_id: string
  hotel_id: string
  room_id: string
  check_in: string
  check_out: string
  total_price: number
  guests?: number
  status?: string
  has_insurance?: boolean
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select()
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function updateReservation(
  id: string,
  updates: Partial<{
    room_id: string
    hotel_id: string
    guests: number
    check_in: string
    check_out: string
    status: string
    total_price: number
  }>
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

// Includes payment adjustments
export async function editReservation(
  id: string,
  updates: {
    room_id: string
    check_in: string
    check_out: string
    guests?: number
  },
  options: {
    payment_method: 'card' | 'points'
    time_zone: string | null
    expected: {
      room_id: string
      check_in: string
      check_out: string
      guests: number | null
      total_price: number
    }
  }
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.rpc('edit_reservation', {
    p_reservation_id: id,
    p_room_id: updates.room_id,
    p_check_in: updates.check_in,
    p_check_out: updates.check_out,
    p_guests: updates.guests ?? null,
    p_payment_method: options.payment_method,
    p_time_zone: options.time_zone,
    p_expected: options.expected,
  })
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function deleteReservation(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)
  return { error }
}
export async function getAccountOverlappingBookings(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.rpc('get_account_overlapping_bookings', {
    p_hotel_id: hotelId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_exclude_reservation_id: excludeReservationId ?? null,
  })
  return { data: data ?? [], error }
}
export async function getCancellationQuote(reservationId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .rpc('get_cancellation_quote', { p_reservation_id: reservationId })
    .maybeSingle()
  return { data, error }
}

export async function cancelReservation(reservationId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .rpc('cancel_reservation', { p_reservation_id: reservationId })
    .single()
  return { data, error }
}

export async function checkoutReservation(
  reservation: {
    account_id: string
    room_id: string
    check_in: string
    check_out: string
    guests?: number
    status?: string
  },
  payment: {
    // Note that total price does not include insurance_premium. Naming is carried over.
    total_price: number
    has_insurance: boolean
    insurance_premium: number
    card_last4: string
    exp_month: number
    exp_year: number
  },
  options: {
    time_zone: string | null
  }
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.rpc('checkout_reservation', {
    p_account_id: reservation.account_id,
    p_room_id: reservation.room_id,
    p_check_in: reservation.check_in,
    p_check_out: reservation.check_out,
    p_guests: reservation.guests ?? null,
    p_time_zone: options.time_zone,
    p_has_insurance: payment.has_insurance,
    p_booking_total: payment.total_price,
    p_insurance_premium: payment.insurance_premium,
    p_card_last4: payment.card_last4,
    p_exp_month: payment.exp_month,
    p_exp_year: payment.exp_year,
  })

  let res = data ? { ...data, reservation: normalizeReservationDates(data.reservation) } : null
  return { data: res, error}
}

// Fixed, reasonable number for simplicity
export function getCancelInsurancePremium(): number {
  return 20
}