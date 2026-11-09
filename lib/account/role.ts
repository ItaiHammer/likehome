import type { DevRole } from './dev-role'

export type ViewerRole = 'signed-out' | 'unchosen' | 'personal' | 'business'

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
  // A failed read must not trap anyone on a screen whose answer is permanent
  if (readFailed) return 'personal'
  return accountType ?? 'unchosen'
}

export function accountLabel(role: ViewerRole): string | null {
  if (role === 'personal') return 'Personal account'
  if (role === 'business') return 'Business account'
  return null
}
