import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { comparisonIds, inIdOrder, toComparisonListing, type ComparisonHotelRow, type ComparisonListing } from '@/lib/comparison'

const LISTING_FIELDS = 'id, name, city, region, country, photo_urls, rating, tags, liteapi_deleted_at, rooms(price_per_night, capacity, tags)'

type ViewedRow = { viewed_at: string; hotels: ComparisonHotelRow | null }

// Newest first, without the stay being compared against
export async function getRecentlyViewedListings(accountId: string, excludeHotelId?: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('recently_viewed_hotels')
    .select(`viewed_at, hotels(${LISTING_FIELDS})`)
    .eq('account_id', accountId)
    .order('viewed_at', { ascending: false })
  // Without generated types, supabase-js can't tell `hotels` is one row (many-to-one), not a list
  const listings = ((data ?? []) as unknown as ViewedRow[])
    .flatMap((row) => toComparisonListing(row.hotels, row.viewed_at) ?? [])
    .filter((listing) => listing.id !== excludeHotelId)
  return { data: listings, error }
}

// In the order of the ids, so the current stay can come first
export async function getComparisonListings(ids: string[]) {
  const wanted = comparisonIds(ids)
  if (wanted.length === 0) return { data: [] as ComparisonListing[], error: null }
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('hotels')
    .select(LISTING_FIELDS)
    .in('id', wanted)
  const listings = ((data ?? []) as ComparisonHotelRow[]).flatMap((hotel) => toComparisonListing(hotel) ?? [])
  return { data: inIdOrder(listings, wanted), error }
}
