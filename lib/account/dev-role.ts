export const DEV_ROLE_COOKIE = 'lh_dev_role'

export type DevRole = 'unchosen' | 'personal' | 'business'

const DEV_ROLES: readonly string[] = ['unchosen', 'personal', 'business']

export function readDevRole(value: string | undefined, nodeEnv: string | undefined): DevRole | null {
  if (nodeEnv !== 'development' || value === undefined) return null
  return DEV_ROLES.includes(value) ? (value as DevRole) : null
}
