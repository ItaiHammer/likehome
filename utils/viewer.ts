import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { resolveRole, type ViewerRole } from '@/lib/account/role'
import { DEV_ROLE_COOKIE, readDevRole, type DevRole } from '@/lib/account/dev-role'
import { parseAccountType } from '@/lib/account/choice'
import type { AccountType } from '@/utils/accounts'

export type Viewer = {
  role: ViewerRole
  userId: string | null
  name: string | null
  email: string | null
  realType: AccountType | null
  devRole: DevRole | null
}

function firstName(...values: unknown[]): string | null {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v.trim()
  return null
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) {
    return { role: 'signed-out', userId: null, name: null, email: null, realType: null, devRole: null }
  }

  const userId = claims.sub as string
  const devRole = readDevRole(cookieStore.get(DEV_ROLE_COOKIE)?.value, process.env.NODE_ENV)
  // maybeSingle, unlike getAccountType's single, tells "no row" apart from a failed read
  const { data: account, error: readError } = await supabase
    .from('accounts')
    .select('account_type, full_name')
    .eq('id', userId)
    .maybeSingle()
  if (readError) console.error('Account type read failed:', readError.message)

  const realType = readError ? null : parseAccountType(account?.account_type)
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>
  return {
    role: resolveRole({ signedIn: true, accountType: realType, readFailed: Boolean(readError), devRole }),
    userId,
    name: firstName(account?.full_name, meta.full_name, meta.name),
    email: typeof claims.email === 'string' ? claims.email : null,
    realType,
    devRole,
  }
})
