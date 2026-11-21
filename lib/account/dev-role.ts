import type { AccountType } from '@/utils/accounts'

export const DEV_ROLE_COOKIE = 'lh_dev_role'

export type DevRole = 'unchosen' | 'personal' | 'business'

const DEV_ROLES: readonly string[] = ['unchosen', 'personal', 'business']

export function readDevRole(value: string | undefined, nodeEnv: string | undefined): DevRole | null {
  if (nodeEnv !== 'development' || value === undefined) return null
  return DEV_ROLES.includes(value) ? (value as DevRole) : null
}

export function realTypeLabel(v: { signedIn: boolean; realType: AccountType | null; readFailed: boolean }): string {
  if (!v.signedIn) return 'Sign in first'
  if (v.readFailed) return "Real: couldn't load"
  return `Real: ${v.realType ?? 'not set'}`
}
