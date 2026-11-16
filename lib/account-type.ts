// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The account type screen (/account-type): every new account starts without a type, and the
// proxy sends it here before My Bookings or Listings (utils/supabase/middleware.ts).

export const ACCOUNT_TYPES = ['personal', 'business'] as const
export type AccountTypeChoice = (typeof ACCOUNT_TYPES)[number]

/** The type a form sent, or null for anything else */
export function parseAccountType(value: unknown): AccountTypeChoice | null {
  return (ACCOUNT_TYPES as readonly unknown[]).includes(value) ? (value as AccountTypeChoice) : null
}

/**
 * Where to go once the type is set: the page the proxy came from, if it's a path on this site.
 * "//evil.com" and "/\evil.com" are other sites to a browser, so they fall back like anything else.
 */
export function nextPath(next: unknown, type: AccountTypeChoice | null): string {
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
    return next
  }
  return type === 'business' ? '/listings' : '/MyBookings'
}
