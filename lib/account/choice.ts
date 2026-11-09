import { PAGE_ROUTES } from '@/constants/routes'
import type { AccountType } from '@/utils/accounts'

const BASE = 'http://n'
const NOT_A_TARGET = ['/account-type', '/api/', '/auth/']
const STAY_PUT = ['/account-type', '/auth/error', '/auth/z/error']

// Unlike the auth callback's check, this result goes straight into redirect()
// with no origin in front, so "//x" or "/\x" would leave the site.
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null
  if (/[\u0000- \u007f\\]/.test(raw)) return null
  const url = new URL(raw, BASE)
  if (url.origin !== BASE) return null
  const path = url.pathname.toLowerCase()
  if (NOT_A_TARGET.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'))) return null
  return url.pathname + url.search
}

export function choicePathFor(next: string | null): string {
  return next ? `${PAGE_ROUTES.ACCOUNT_TYPE}?next=${encodeURIComponent(next)}` : PAGE_ROUTES.ACCOUNT_TYPE
}

export function choiceRedirect(pathname: string, search: string): string | null {
  const path = pathname.toLowerCase()
  if (STAY_PUT.includes(path)) return null
  if (path === PAGE_ROUTES.LOGIN) {
    const next = safeNext(new URLSearchParams(search).get('next'))
    return next ? choicePathFor(next) : null
  }
  if (pathname === '/' && !search) return choicePathFor(null)
  return choicePathFor(safeNext(pathname + (search ? `?${search}` : '')))
}

function inAreaOf(path: string, type: AccountType): boolean {
  const lower = new URL(path, BASE).pathname.toLowerCase()
  return lower.startsWith(type === 'personal' ? PAGE_ROUTES.LISTINGS : PAGE_ROUTES.MY_BOOKINGS.toLowerCase())
}

export function afterChoicePath(next: unknown, type: AccountType): string {
  const safe = safeNext(next)
  if (!safe || inAreaOf(safe, type)) return '/'
  return safe
}

export function parseAccountType(value: unknown): AccountType | null {
  return value === 'personal' || value === 'business' ? value : null
}

export type ChoiceOutcome =
  | { kind: 'continue'; type: AccountType }
  | { kind: 'already-set'; type: AccountType }
  | { kind: 'error'; message: string }

const TRY_AGAIN = "We couldn't save that. Try again."

export function choiceOutcome({
  requested,
  errorCode,
  storedType,
}: {
  requested: AccountType
  errorCode: string | null
  storedType: AccountType | null
}): ChoiceOutcome {
  if (!errorCode) return { kind: 'continue', type: requested }
  if (errorCode === 'P0001') {
    if (storedType === requested) return { kind: 'continue', type: requested }
    if (storedType) return { kind: 'already-set', type: storedType }
    return { kind: 'error', message: TRY_AGAIN }
  }
  if (errorCode === 'P0002') return { kind: 'error', message: "We couldn't find your account. Sign out and sign in again." }
  return { kind: 'error', message: TRY_AGAIN }
}
