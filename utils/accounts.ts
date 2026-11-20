import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export type AccountType = 'personal' | 'business'

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

// null = the user hasn't picked yet (send them to the account type screen)
export async function getAccountType(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('accounts')
    .select('account_type')
    .eq('id', id)
    .single()
  return { data: (data?.account_type ?? null) as AccountType | null, error }
}

// Sets the signed-in user's type once. Already set -> error.code "P0001".
export async function setAccountType(type: AccountType) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.rpc('set_account_type', { p_type: type })
  return { data: data as AccountType | null, error }
}