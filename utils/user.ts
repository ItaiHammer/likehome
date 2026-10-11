import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function getUserId() {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return { supabase, userId: null }
  return { supabase, userId: data.claims.sub as string }
}