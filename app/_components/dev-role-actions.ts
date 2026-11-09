'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { PAGE_ROUTES } from '@/constants/routes'
import { DEV_ROLE_COOKIE } from '@/lib/account/dev-role'

const ROLES = ['real', 'unchosen', 'personal', 'business']

export async function setDevRole(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return
  const role = formData.get('role')
  if (typeof role !== 'string' || !ROLES.includes(role)) return

  const cookieStore = await cookies()
  if (role === 'real') cookieStore.delete(DEV_ROLE_COOKIE)
  else cookieStore.set(DEV_ROLE_COOKIE, role, { path: '/', httpOnly: true, sameSite: 'lax' })
  revalidatePath('/', 'layout')
  if (role === 'unchosen') redirect(PAGE_ROUTES.ACCOUNT_TYPE)
}
