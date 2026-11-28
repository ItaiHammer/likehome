// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { pageCount as pagesFor, pageParam } from './pagination.ts'

/** Same rate as points_to_dollars.sql and dollars_to_points (credit_to_points.sql) */
export const POINTS_PER_DOLLAR = 100

export const pointsToDollars = (points: number) => Math.round(points) / POINTS_PER_DOLLAR
export const dollarsToPoints = (dollars: number) => Math.round(dollars * POINTS_PER_DOLLAR)

/** A points number as people read it: whole, with thousands separators (26,850) */
export const pointsNumber = (points: number) => Math.round(points).toLocaleString('en-US')
export const formatPoints = (points: number) => `${pointsNumber(points)} pts`

/** A percent off the checkout total, paid with checkout's `points` field */
export type StayDiscount = { id: string; category: string; title: string; percent: number }

export const STAY_DISCOUNTS: StayDiscount[] = [
  { id: 'quarter-off', category: '25% off', title: '25% off your whole stay', percent: 25 },
  { id: 'half-off', category: '50% off', title: '50% off your whole stay', percent: 50 },
  { id: 'three-quarters-off', category: '75% off', title: '75% off your whole stay', percent: 75 },
  { id: 'free-stay', category: 'Free stay', title: 'Stay for free', percent: 100 },
]

export const findDiscount = (id: string | null) => STAY_DISCOUNTS.find((d) => d.id === id) ?? null

/** Points a discount costs. Dollars are always worked out from these points, as the database does. */
export function discountPoints(percent: number, total: number): number {
  if (!(total > 0) || !(percent > 0)) return 0
  return dollarsToPoints((total * Math.min(percent, 100)) / 100)
}

/** What a discount costs and saves, for a stay with this total */
export function rewardPrice(discount: StayDiscount, total: number): { points: number; value: number } {
  const points = discountPoints(discount.percent, total)
  return { points, value: pointsToDollars(points) }
}

/** What the card pays after points, capped like checkout_reservation at the balance and the checkout total */
export function pointsCharge(requested: number, balance: number, checkoutTotal: number): number {
  const points = Math.max(0, Math.min(requested, balance, dollarsToPoints(checkoutTotal)))
  return Math.max(0, Math.round((checkoutTotal - pointsToDollars(points)) * 100) / 100)
}

/** /api/checkout's 409 when its price no longer matches the one the reward was chosen against */
export const PRICE_CHANGED_ERROR = 'The price changed. Please review your booking.'

export const pointsNeeded = (balance: number, cost: number) => Math.max(0, cost - balance)

/** The points checkout showed, passed to the confirmation as ?points= */
export function shownPointsParam(param: string | string[] | undefined): number | null {
  return typeof param === 'string' && /^\d{1,9}$/.test(param) && Number(param) > 0 ? Number(param) : null
}

/** Points checkout showed but the server didn't spend (it caps at the current balance and its own price) */
export function pointsShortfall(shown: number | null, used: number): number {
  return shown !== null && used < shown ? shown - used : 0
}

/** Why the confirmation used fewer points than checkout showed; `charged` is what the card paid */
export function shortfallNote(shortfall: number, charged: number | null): string {
  const fewer = `We used ${formatPoints(shortfall)} fewer than checkout showed`
  if (charged === null) return `${fewer}, because your points balance or the room price changed.`
  return charged > 0
    ? `${fewer}, because your points balance or the room price changed. The difference was charged to your card.`
    : `${fewer}, because the room price was lower, so fewer points were needed.`
}

export type PointsTransactionType = 'earn' | 'redeem' | 'refund' | 'adjust'

export type PointsActivity = {
  id: string
  type: PointsTransactionType
  points: number
  createdAt: string
  hotelName: string | null
}

export type HistoryFilter = 'all' | 'earned' | 'redeemed'

export const HISTORY_PAGE_SIZE = 10

export function historyFilter(param: string | string[] | undefined): HistoryFilter {
  return param === 'earned' || param === 'redeemed' ? param : 'all'
}

export const historyPage = pageParam

export const pageCount = (total: number) => pagesFor(total, HISTORY_PAGE_SIZE)

// Earning and refunds are always positive and redeeming always negative (points_storage.sql)
export function matchesFilter(activity: PointsActivity, filter: HistoryFilter): boolean {
  if (filter === 'earned') return activity.points > 0
  if (filter === 'redeemed') return activity.points < 0
  return true
}

const ACTIVITY_LABELS: Record<PointsTransactionType, string> = {
  earn: 'Completed stay',
  redeem: 'Points used',
  refund: 'Cancellation refund',
  adjust: 'Points adjustment',
}

export function activityLabel(activity: PointsActivity): string {
  const label = ACTIVITY_LABELS[activity.type] ?? 'Points'
  return activity.hotelName ? `${label} · ${activity.hotelName}` : label
}

export function signedPoints(points: number): string {
  return `${points < 0 ? '−' : '+'} ${formatPoints(Math.abs(points))}`
}

export function formatActivityDate(iso: string, timeZone?: string | null): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  try {
    return date.toLocaleDateString('en-US', { ...options, timeZone: timeZone || 'UTC' })
  } catch {
    return date.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
  }
}
