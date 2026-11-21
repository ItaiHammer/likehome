import { cookies } from 'next/headers'
import { todayInTimeZone } from './reservation-logic'
import { TZ_COOKIE } from './tz-cookie'

/**
 * "Today" (YYYY-MM-DD) for the guest viewing a server-rendered page, from the time zone
 * their browser saved in the `tz` cookie (see app/_components/TimeZoneCookie.tsx).
 * Falls back to UTC on a first visit, before the cookie exists.
 */
export async function guestToday(): Promise<string> {
  const store = await cookies()
  return todayInTimeZone(store.get(TZ_COOKIE)?.value)
}

/**
 * The guest's time zone for an API request: the `time_zone` the browser sent with it, else the `tz`
 * cookie. Null when neither is there, so callers fall back to UTC as todayInTimeZone does.
 */
export async function guestTimeZone(sent: unknown): Promise<string | null> {
  if (typeof sent === 'string' && sent.trim() !== '') return sent.trim()
  const store = await cookies()
  return store.get(TZ_COOKIE)?.value || null
}
