// The search bar's fields as one search: read from the form (or a /search query), summed up in a
// line, and the last few kept in the browser as recent searches, each list tagged with the account it belongs to.
// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { formatRange, formatShort } from '../app/_components/dates.ts'
import { parseDate } from '../utils/reservation-logic.ts'

export const RECENT_SEARCHES_KEY = 'likehome_recent_searches'
const MAX_RECENT_SEARCHES = 3

// GuestsPicker's limits
const ADULTS = { min: 1, max: 16, fallback: 2 }
const CHILDREN = { min: 0, max: 10, fallback: 0 }
const MAX_TEXT = 200

export type SearchFields = {
  where: string
  /** LiteAPI's place id, when the place was picked from its suggestions */
  place?: string
  checkIn?: string
  checkOut?: string
  adults: number
  children: number
}

/** A search worth repeating: it has a place, and dates only when both are set and still ahead */
export type RecentSearch = SearchFields

/** FormData, URLSearchParams, or a lookup into a plain object */
type FieldSource = { get(name: string): unknown }

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The account the searches belong to: its id, null when signed out, undefined while not known yet */
export type SearchOwner = string | null | undefined

const isDate = (value: unknown): value is string => parseDate(value) !== null

const text = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT) : '')

function count(value: unknown, { min, max, fallback }: typeof ADULTS) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/** The search the bar's fields describe. A check-out only counts after a check-in. */
export function readSearchFields(source: FieldSource): SearchFields {
  const fields: SearchFields = {
    where: text(source.get('where')),
    adults: count(source.get('adults'), ADULTS),
    children: count(source.get('children'), CHILDREN),
  }
  const place = text(source.get('place'))
  if (place) fields.place = place
  const checkIn = source.get('checkIn')
  const checkOut = source.get('checkOut')
  if (isDate(checkIn)) {
    fields.checkIn = checkIn
    if (isDate(checkOut) && checkOut > checkIn) fields.checkOut = checkOut
  }
  return fields
}

/** "Nov 27 - Nov 29", "Nov 27 - Add check-out" / "Add check-in - Nov 29" while one end is set, or "" with no dates */
export function datesLabel(checkIn = '', checkOut = '') {
  if (checkIn && checkOut) return formatRange(checkIn, checkOut)
  if (checkIn) return `${formatShort(checkIn)} - Add check-out`
  return checkOut ? `Add check-in - ${formatShort(checkOut)}` : ''
}

/** "Nov 27 - Nov 29 · 2 guests", or "Any dates · 2 guests" */
export function searchDetails({ checkIn, checkOut, adults, children }: Omit<SearchFields, 'where'>) {
  const guests = adults + children
  return `${datesLabel(checkIn, checkOut) || 'Any dates'} · ${guests} ${guests === 1 ? 'guest' : 'guests'}`
}

function asRecent(fields: SearchFields, today: string): RecentSearch | null {
  if (!fields.where) return null
  const { checkIn, checkOut, ...rest } = fields
  // Past dates are dropped, the place is kept
  return checkIn && checkOut && checkIn >= today ? { ...rest, checkIn, checkOut } : rest
}

const searchKey = (s: RecentSearch) => [s.where.toLowerCase(), s.checkIn ?? '', s.checkOut ?? '', s.adults, s.children].join('|')

function distinct(list: RecentSearch[]) {
  const seen = new Set<string>()
  return list
    .filter((s) => {
      const key = searchKey(s)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_RECENT_SEARCHES)
}

/** The list with `search` first, newest to oldest, each search once */
export function addRecentSearch(list: RecentSearch[], search: SearchFields, today: string): RecentSearch[] {
  const recent = asRecent(search, today)
  return recent ? distinct([recent, ...list]) : list
}

/** The stored list when it belongs to `owner`, trusting nothing in it. Lists saved before searches had an owner are dropped. */
export function parseRecentSearches(raw: string | null, today: string, owner: SearchOwner): RecentSearch[] {
  if (owner === undefined) return []
  let stored: unknown
  try {
    stored = JSON.parse(raw ?? 'null')
  } catch {
    return []
  }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return []
  const { owner: storedOwner, searches } = stored as { owner?: unknown; searches?: unknown }
  if (storedOwner !== owner || !Array.isArray(searches)) return []
  const list = searches.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const recent = asRecent(readSearchFields({ get: (name) => (entry as Record<string, unknown>)[name] }), today)
    return recent ? [recent] : []
  })
  return distinct(list)
}

function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Never throws: storage that's blocked, full or holding junk reads as no recent searches */
export function loadRecentSearches(today: string, owner: SearchOwner, storage: StorageLike | null = browserStorage()): RecentSearch[] {
  try {
    return parseRecentSearches(storage?.getItem(RECENT_SEARCHES_KEY) ?? null, today, owner)
  } catch {
    return []
  }
}

/** Remembers a submitted search for `owner`, replacing another account's list; one without a place isn't kept. Never throws. */
export function saveRecentSearch(search: SearchFields, today: string, owner: SearchOwner, storage: StorageLike | null = browserStorage()) {
  if (!storage || !search.where || owner === undefined) return
  try {
    const searches = addRecentSearch(loadRecentSearches(today, owner, storage), search, today)
    storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify({ owner, searches }))
  } catch {}
}

/** Forgets the recent searches, for when the account changes. Never throws. */
export function clearRecentSearches(storage: StorageLike | null = browserStorage()) {
  try {
    storage?.removeItem(RECENT_SEARCHES_KEY)
  } catch {}
}
