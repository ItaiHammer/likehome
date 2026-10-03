import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function getReservationsByAccount(accountId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('account_id', accountId)
  return { data, error }
}

export async function getReservationsByHotel(hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('hotel_id', hotelId)
  return { data, error }
}

export async function getReservationsByRoom(roomId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('room_id', roomId)
  return { data, error }
}

export async function getReservation(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createReservation(reservation: {
  account_id: string
  hotel_id: string
  room_id: string
  check_in: string
  check_out: string
  total_price: number
  status?: string
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select()
  return { data, error }
}

export async function updateReservation(
  id: string,
  updates: Partial<{
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
  return { data, error }
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
