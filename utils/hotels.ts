import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function listHotels() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
  return { data, error }
}

export async function getHotel(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createHotel(hotel: {
  owner_id?: string | null
  name: string
  description?: string
  address: string
  city: string
  region?: string
  country?: string
  photo_urls?: string[]
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .insert(hotel)
    .select()
  return { data, error }
}

export async function updateHotel(
  id: string,
  updates: Partial<{
    name: string
    description: string
    address: string
    city: string
    region: string
    country: string
    photo_urls: string[]
  }>
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteHotel(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase
    .from('hotels')
    .delete()
    .eq('id', id)
  return { error }
}
