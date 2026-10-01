import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function searchAvailableHotels(filters: {
  query?: string
  city?: string
  country?: string
  check_in?: string // YYYY-MM-DD
  check_out?: string // YYYY-MM-DD
  guests?: number
  min_price?: number
  max_price?: number
  sort?: 'recommended' | 'price-low' | 'price-high'
  page?: number
  page_size?: number
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? 21

  const { data, error } = await supabase.rpc('search_hotels', {
    p_query: filters.query ?? null,
    p_city: filters.city ?? null,
    p_country: filters.country ?? null,
    p_check_in: filters.check_in ?? null,
    p_check_out: filters.check_out ?? null,
    p_guests: filters.guests ?? null,
    p_min_price: filters.min_price ?? null,
    p_max_price: filters.max_price ?? null,
    p_sort: filters.sort ?? 'recommended',
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  })

  const total = data?.[0]?.total_count ?? 0
  return { data, error, total }
}
