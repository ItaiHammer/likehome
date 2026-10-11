import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function getHotels() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
  return { data, error }
}

export async function getHotelsByOwner(ownerId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('owner_id', ownerId)
  return { data, error }
}

export async function getHotelsByName(name: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('name', name)
  return { data, error }
}

export async function getHotelsByAddress(address: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('address', address)
  return { data, error }
}

export async function getHotelsByCity(city: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('city', city)
  return { data, error }
}

export async function getHotelsByRegion(region: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('region', region)
  return { data, error }
}

export async function getHotelsByCountry(country: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('country', country)
  return { data, error }
}

export async function searchHotels(filters: {
  city?: string
  region?: string
  country?: string
  owner_id?: string
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  let query = supabase.from('hotels').select('*')

  if (filters.city) query = query.eq('city', filters.city)
  if (filters.region) query = query.eq('region', filters.region)
  if (filters.country) query = query.eq('country', filters.country)
  if (filters.owner_id) query = query.eq('owner_id', filters.owner_id)

  const { data, error } = await query
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
