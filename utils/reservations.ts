import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

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
  children?: number
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

// A booking priced live by LiteAPI. The reservations trigger reprices a signed-in user's own writes from the room's
// stored rate, so these two write with the server key; the routes have already checked the account, room and party.
const NO_SERVER_KEY = { message: 'SUPABASE_SECRET_KEY is not set.', code: 'NO_SERVER_KEY' }

export async function createLiveReservation(reservation: Parameters<typeof createReservation>[0]) {
  const supabase = createAdminClient()
  if (!supabase) return { data: null, error: NO_SERVER_KEY }
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select()
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function updateLiveReservation(
  id: string,
  accountId: string,
  updates: Parameters<typeof updateReservation>[1]
) {
  const supabase = createAdminClient()
  if (!supabase) return { data: null, error: NO_SERVER_KEY }
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .eq('account_id', accountId)
    .eq('status', 'confirmed')
    .select()
  return { data: data?.map(normalizeReservationDates) ?? data, error }
}

export async function updateReservation(
  id: string,
  updates: Partial<{
    room_id: string
    hotel_id: string
    guests: number
    children: number
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