import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function recordHotelView(accountId: string, hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('recently_viewed_hotels')
    .upsert(
      { account_id: accountId, hotel_id: hotelId, viewed_at: new Date().toISOString() },
      { onConflict: 'account_id,hotel_id' }
    )
    .select()
  return { data, error }
}

export async function getRecentlyViewedHotels(accountId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('recently_viewed_hotels')
    .select('viewed_at, hotels(*)')
    .eq('account_id', accountId)
    .order('viewed_at', { ascending: false })
  return { data, error }
}

export async function clearRecentlyViewed(accountId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase
    .from('recently_viewed_hotels')
    .delete()
    .eq('account_id', accountId)
  return { error }
}
