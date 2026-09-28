import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function listRoomsByHotel(hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotelId)
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
