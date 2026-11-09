'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { PAGE_ROUTES } from '@/constants/routes'
import { afterChoicePath, choiceOutcome, choicePathFor, parseAccountType, safeNext } from '@/lib/account/choice'
import { DEV_ROLE_COOKIE } from '@/lib/account/dev-role'
import { getAccountType, setAccountType, type AccountType } from '@/utils/accounts'
import { getViewer } from '@/utils/viewer'

export type ChooseState = { message: string; continueHref?: string } | null

const TYPE_NAME: Record<AccountType, string> = { personal: 'Personal', business: 'Business' }

export async function chooseAccountType(_prev: ChooseState, formData: FormData): Promise<ChooseState> {
  const next = safeNext(formData.get('next'))
  const type = parseAccountType(formData.get('type'))
  const viewer = await getViewer()

  if (viewer.role === 'signed-out') {
    redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(choicePathFor(next))}`)
  }
  if (!type) return { message: 'Choose Personal or Business.' }

  // devRole is only ever set in development (readDevRole), so this branch can't run in production
  if (viewer.devRole) {
    const cookieStore = await cookies()
    cookieStore.set(DEV_ROLE_COOKIE, type, { path: '/', httpOnly: true, sameSite: 'lax' })
    revalidatePath('/', 'layout')
    redirect(afterChoicePath(next, type))
  }

  const { error } = await setAccountType(type)
  let storedType: AccountType | null = null
  if (error?.code === 'P0001' && viewer.userId) {
    const reread = await getAccountType(viewer.userId)
    storedType = reread.error ? null : reread.data
  }

  const outcome = choiceOutcome({ requested: type, errorCode: error?.code ?? null, storedType })
  if (outcome.kind === 'error') return { message: outcome.message }
  if (outcome.kind === 'already-set') {
    return {
      message: `Your account is already set to ${TYPE_NAME[outcome.type]}.`,
      continueHref: afterChoicePath(next, outcome.type),
    }
  }
  revalidatePath('/', 'layout')
  redirect(afterChoicePath(next, outcome.type))
}
