import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function getAccount(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function updateAccount(id: string, updates: Partial<{ full_name: string }>) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select()
  return { data, error }
}