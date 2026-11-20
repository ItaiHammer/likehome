import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// Hotels an account saved as favorites. One row per (account, hotel); RLS limits every query to the user's own rows.

// Adding a hotel that is already a favorite is a no-op.
export async function addFavoriteHotel(accountId: string, hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('favorite_hotels')
    .upsert(
      { account_id: accountId, hotel_id: hotelId },
      { onConflict: 'account_id,hotel_id', ignoreDuplicates: true }
    )
    .select()
  return { data, error }
}

export async function removeFavoriteHotel(accountId: string, hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { error } = await supabase
    .from('favorite_hotels')
    .delete()
    .eq('account_id', accountId)
    .eq('hotel_id', hotelId)
  return { error }
}

// Newest favorite first, each row with its full hotel record.
export async function getFavoriteHotels(accountId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('favorite_hotels')
    .select('created_at, hotels(*)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// data is true when the hotel is one of the account's favorites (for the heart state).
export async function isFavoriteHotel(accountId: string, hotelId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('favorite_hotels')
    .select('id')
    .eq('account_id', accountId)
    .eq('hotel_id', hotelId)
    .maybeSingle()
  return { data: data !== null, error }
}
