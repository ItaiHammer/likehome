import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function getRoomsByHotel(hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotelId)
  return { data, error }
}

export async function getRoomsByType(roomType: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_type', roomType)
  return { data, error }
}

export async function getRoomsByCapacity(capacity: number) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('capacity', capacity)
  return { data, error }
}

export async function searchRooms(filters: {
  hotel_id?: string
  room_type?: string
  capacity?: number
  min_price?: number
  max_price?: number
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  let query = supabase.from('rooms').select('*')

  if (filters.hotel_id) query = query.eq('hotel_id', filters.hotel_id)
  if (filters.room_type) query = query.eq('room_type', filters.room_type)
  if (filters.capacity) query = query.eq('capacity', filters.capacity)
  if (filters.min_price !== undefined)
    query = query.gte('price_per_night', filters.min_price)
  if (filters.max_price !== undefined)
    query = query.lte('price_per_night', filters.max_price)

  const { data, error } = await query
  return { data, error }
}

export async function getRoom(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createRoom(room: {
  hotel_id: string
  room_type: string
  price_per_night: number
  capacity?: number
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .insert(room)
    .select()
  return { data, error }
}

export async function updateRoom(
  id: string,
  updates: Partial<{
    room_type: string
    price_per_night: number
    capacity: number
  }>
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteRoom(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id)
  return { error }
}
