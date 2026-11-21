// The search calendar's date shortcuts, worked out from the guest's today.
// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { addDays, toUTC } from '../app/_components/dates.ts'

export type QuickDates = { label: string; checkIn: string; checkOut: string }

const weekday = (iso: string) => new Date(toUTC(iso)).getUTCDay()

/**
 * A weekend is Friday and Saturday night, checking out Sunday. "This weekend" is the one with a night
 * still to come: on a Saturday that's just Saturday night, and from Sunday it's the coming one.
 * "Next week" is the seven nights from next Monday.
 */
export function quickDateRanges(today: string): QuickDates[] {
  const day = weekday(today)
  const sunday = addDays(today, day === 0 ? 7 : 7 - day)
  const friday = addDays(sunday, -2)
  const monday = addDays(today, day === 0 ? 1 : 8 - day)
  return [
    { label: 'This weekend', checkIn: friday < today ? today : friday, checkOut: sunday },
    { label: 'Next weekend', checkIn: addDays(friday, 7), checkOut: addDays(sunday, 7) },
    { label: 'Next week', checkIn: monday, checkOut: addDays(monday, 7) },
  ]
}
