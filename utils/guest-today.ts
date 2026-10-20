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
