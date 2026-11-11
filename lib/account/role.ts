import type { DevRole } from './dev-role'

// unknown: signed in, but the account read failed, so the type can't be told
export type ViewerRole = 'signed-out' | 'unchosen' | 'unknown' | 'personal' | 'business'

export function resolveRole({
  signedIn,
  accountType,
  readFailed,
  devRole,
}: {
  signedIn: boolean
  accountType: 'personal' | 'business' | null
  readFailed: boolean
  devRole: DevRole | null
}): ViewerRole {
  if (!signedIn) return 'signed-out'
  if (devRole) return devRole
  if (readFailed) return 'unknown'
  return accountType ?? 'unchosen'
}

export function accountLabel(role: ViewerRole): string | null {
  if (role === 'personal') return 'Personal account'
  if (role === 'business') return 'Business account'
  return null
}
