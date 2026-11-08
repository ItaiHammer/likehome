import 'server-only'
import { countNights, MAX_NIGHTS, todayUTC } from '../../utils/reservation-logic.ts'
import { MAX_CHILD_AGE, type Party } from './party.ts'
import { LITEAPI_BASE } from './types.ts'
import type { LiteMoney, LiteOffer, LiteRate, LiteRatesRequest, LiteRatesResponse } from './types.ts'

export type StayQuery = { checkIn: string; checkOut: string } & Party
export type Quote = {
  /** What the stay is sold for: the retail total, raised to LiteAPI's suggested selling price when that's higher */
  total: number
  perNight: number
  offerId: string
  rateName: string
  boardType: string
  refundable: boolean
  /** Refundable rates: free cancellation ends as this day starts, like the site's own rule. null when the rate lists no fee. */
  cancelBy: string | null
  /** Fees the guest pays the hotel on arrival, on top of `total` */
  dueAtProperty: number
}
export type HotelRates = { mapped: boolean; byRoom: Record<string, Quote>; byName: Record<string, Quote>; cheapest: Quote }
export type Live<T> = { status: 'live'; value: T } | { status: 'sold_out' } | { status: 'unavailable' }

type Mode = 'rooms' | 'from'
type Entry = { expires: number; value: Promise<Live<HotelRates>> }

const SOLD_OUT = { status: 'sold_out' } as const
const UNAVAILABLE = { status: 'unavailable' } as const
const LIVE_TTL = 15 * 60_000
// Short so an outage is retried soon, long enough that pages don't each wait out the fetch timeout meanwhile
const UNAVAILABLE_TTL = 60_000
const CHUNK = 200
const MAX_ENTRIES = 2000
// Pages and the prices route need no sign-in and every new stay is a fresh call on the shared rate limit,
// so the dates anyone can make us quote are bounded
const MAX_DAYS_AHEAD = 365

// On globalThis so dev HMR reloads of this module keep the cache
const g = globalThis as typeof globalThis & { __likehomeLiteApi?: Map<string, Entry> }
const store = (g.__likehomeLiteApi ??= new Map<string, Entry>())

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
const cents = (n: number) => Math.round(n * 100) / 100

function usd(money: LiteMoney[] | LiteMoney | null | undefined): number | null {
  const m = Array.isArray(money) ? money[0] : money
  if (!m || m.currency !== 'USD') return null
  const amount = Number(m.amount)
  return Number.isFinite(amount) ? amount : null
}

// The day free cancellation ends as it starts. cancelTime is GMT, so in US time zones the first fee can start on
// the evening before its date: ending a day early holds in every one of them.
function cancelByOf(rate: LiteRate): string | null {
  const starts = (rate.cancellationPolicies?.cancelPolicyInfos ?? [])
    .filter((info) => Number(info?.amount) > 0 && /^\d{4}-\d{2}-\d{2}/.test(info.cancelTime ?? ''))
    .map((info) => info.cancelTime!.slice(0, 10))
    .sort()
  if (starts.length === 0) return null
  const day = new Date(`${starts[0]}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
}

// adultCount and childCount only repeat the party the rate was quoted for (never the room's limits), so
// a rate for any other party can't be sold to this one
const quotedFor = (rate: LiteRate, party: Party) =>
  (typeof rate.adultCount !== 'number' || rate.adultCount === party.adults) &&
  (typeof rate.childCount !== 'number' || rate.childCount === party.children.length)

function quoteOf(offer: LiteOffer, nights: number, party?: Party): Quote | null {
  const rates = offer.rates
  if (!offer.offerId || !Array.isArray(rates) || rates.length === 0) return null
  let sum = 0
  let dueAtProperty = 0
  let cancelBy: string | null = null
  for (const rate of rates) {
    const amount = usd(rate?.retailRate?.total)
    if (amount === null) return null
    if (party && !quotedFor(rate, party)) return null
    // LiteAPI's terms: a public page may not sell below the suggested selling price (SSP)
    sum += Math.max(amount, usd(rate.retailRate?.suggestedSellingPrice) ?? 0)
    for (const fee of rate.retailRate?.taxesAndFees ?? []) {
      if (fee?.included === false && fee.currency === 'USD') dueAtProperty += Number(fee.amount) || 0
    }
    const ends = cancelByOf(rate)
    if (ends && (!cancelBy || ends < cancelBy)) cancelBy = ends
  }
  const total = cents(sum)
  if (total <= 0) return null
  const refundable = rates.every((r) => r.cancellationPolicies?.refundableTag === 'RFN')
  return {
    total,
    // Unrounded so calculateTotalPrice (nights × perNight, rounded to cents) gives back exactly `total`
    perNight: total / nights,
    offerId: offer.offerId,
    rateName: rates[0].name ?? '',
    boardType: rates[0].boardType ?? '',
    refundable,
    cancelBy: refundable ? cancelBy : null,
    dueAtProperty: cents(dueAtProperty),
  }
}

function keepCheapest(into: Record<string, Quote>, key: string, quote: Quote) {
  if (!Object.hasOwn(into, key) || quote.total < into[key].total) into[key] = quote
}

/** `party` drops any rate LiteAPI quoted for a different party */
export function parseRatesResponse(body: LiteRatesResponse, nights: number, party?: Party): Map<string, HotelRates> {
  const out = new Map<string, HotelRates>()
  if (!(nights > 0)) return out
  for (const hotel of Array.isArray(body?.data) ? body.data : []) {
    if (!hotel?.hotelId || !Array.isArray(hotel.roomTypes)) continue
    for (const offer of hotel.roomTypes) {
      const quote = offer ? quoteOf(offer, nights, party) : null
      if (!quote) continue
      let r = out.get(hotel.hotelId)
      if (!r) out.set(hotel.hotelId, (r = { mapped: false, byRoom: {}, byName: {}, cheapest: quote }))
      else if (quote.total < r.cheapest.total) r.cheapest = quote
      const first = offer.rates![0]
      const roomId = first.mappedRoomId
      if (roomId != null && String(roomId) !== '') {
        r.mapped = true
        keepCheapest(r.byRoom, String(roomId), quote)
      }
      const name = normalize(first.name ?? '')
      if (name) keepCheapest(r.byName, name, quote)
    }
  }
  return out
}

export function quoteForRoom(r: HotelRates, room: { liteapiRoomId: string | null; name: string }): Live<Quote> {
  if (room.liteapiRoomId != null && Object.hasOwn(r.byRoom, room.liteapiRoomId)) {
    return { status: 'live', value: r.byRoom[room.liteapiRoomId] }
  }
  // A mapped hotel tags every offer with its room, so a room with no offer has nothing left to sell
  if (r.mapped) return SOLD_OUT
  const name = normalize(room.name)
  return name && Object.hasOwn(r.byName, name) ? { status: 'live', value: r.byName[name] } : UNAVAILABLE
}

const every = (ids: string[], live: Live<HotelRates>) => new Map(ids.map((id): [string, Live<HotelRates>] => [id, live]))

async function requestRates(hotelIds: string[], q: StayQuery, nights: number, mode: Mode, apiKey: string) {
  const body: LiteRatesRequest = {
    hotelIds,
    occupancies: [{ adults: q.adults, ...(q.children.length ? { children: q.children } : {}) }],
    currency: 'USD',
    guestNationality: 'US',
    checkin: q.checkIn,
    checkout: q.checkOut,
    timeout: 6,
    limit: hotelIds.length,
    // Without roomMapping LiteAPI can add offers it leaves out with it, which the stay page (by room) can't sell
    roomMapping: true,
    ...(mode === 'from' ? { maxRatesPerHotel: 1 } : {}),
  }
  try {
    const res = await fetch(`${LITEAPI_BASE}/hotels/rates`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    // LiteAPI reports "no availability for any of these hotels" as a 204, which res.ok counts as success
    if (res.status === 204) return every(hotelIds, SOLD_OUT)
    const json = (await res.json().catch(() => null)) as LiteRatesResponse | null
    if (json?.error?.code === 2001) return every(hotelIds, SOLD_OUT)
    const data = res.ok && json && Array.isArray(json.data) ? json.data : null
    if (!data) {
      console.warn('[liteapi] rates failed', res.status, json?.error?.code)
      return every(hotelIds, UNAVAILABLE)
    }
    const parsed = parseRatesResponse({ data }, nights, q)
    const offered = new Set(data.filter((h) => h?.roomTypes?.length).map((h) => h.hotelId))
    return new Map(
      hotelIds.map((id): [string, Live<HotelRates>] => {
        const rates = parsed.get(id)
        if (rates) return [id, { status: 'live', value: rates }]
        // Offers came back but none had a usable USD price: that isn't evidence the hotel is full
        return [id, offered.has(id) ? UNAVAILABLE : SOLD_OUT]
      })
    )
  } catch (error) {
    console.warn('[liteapi] rates failed', error instanceof Error ? error.name : 'error')
    return every(hotelIds, UNAVAILABLE)
  }
}

// A live price is saved with the server key (the reservations trigger reprices a signed-in user's own booking from
// the stored rate), so without SUPABASE_SECRET_KEY nothing is quoted live and every page shows the stored price
// checkout charges
export const liveRatesEnabled = () => Boolean(process.env.LITEAPI_KEY && process.env.SUPABASE_SECRET_KEY)

// The ages in order, so the same children listed differently share a quote
const cacheKey = (mode: Mode, id: string, q: StayQuery) =>
  `${mode}|${id}|${q.checkIn}|${q.checkOut}|${q.adults}|${[...q.children].sort((a, b) => a - b).join(',')}`

const validParty = (q: Party) =>
  Number.isInteger(q.adults) &&
  q.adults >= 1 &&
  Array.isArray(q.children) &&
  q.children.every((age) => Number.isInteger(age) && age >= 0 && age <= MAX_CHILD_AGE)

async function ratesFor(mode: Mode, liteapiIds: string[], q: StayQuery): Promise<Map<string, Live<HotelRates>>> {
  const ids = [...new Set(liteapiIds.filter(Boolean))]
  const apiKey = process.env.LITEAPI_KEY
  const nights = countNights(q.checkIn, q.checkOut)
  if (
    !apiKey ||
    !liveRatesEnabled() ||
    nights < 1 ||
    nights > MAX_NIGHTS ||
    countNights(todayUTC(), q.checkIn) > MAX_DAYS_AHEAD ||
    !validParty(q)
  ) {
    return every(ids, UNAVAILABLE)
  }

  const now = Date.now()
  if (store.size > MAX_ENTRIES) {
    for (const [key, entry] of store) if (entry.expires <= now) store.delete(key)
    // Still full when a flood of distinct stays arrives within the TTL: drop the earliest keys (Map keeps insertion order)
    for (const key of store.keys()) {
      if (store.size <= MAX_ENTRIES) break
      store.delete(key)
    }
  }

  const pending = new Map<string, Promise<Live<HotelRates>>>()
  const missing: string[] = []
  for (const id of ids) {
    const hit = store.get(cacheKey(mode, id, q))
    if (hit && hit.expires > now) pending.set(id, hit.value)
    else missing.push(id)
  }
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK)
    const batch = requestRates(chunk, q, nights, mode, apiKey)
    for (const id of chunk) {
      const entry: Entry = { expires: now + LIVE_TTL, value: batch.then((m) => m.get(id) ?? UNAVAILABLE) }
      entry.value.then((live) => {
        entry.expires = Date.now() + (live.status === 'unavailable' ? UNAVAILABLE_TTL : LIVE_TTL)
      })
      store.set(cacheKey(mode, id, q), entry)
      pending.set(id, entry.value)
    }
  }

  const values = await Promise.all(ids.map((id) => pending.get(id)!))
  return new Map(ids.map((id, i): [string, Live<HotelRates>] => [id, values[i]]))
}

export async function getRoomRates(liteapiIds: string[], q: StayQuery): Promise<Map<string, Live<HotelRates>>> {
  return ratesFor('rooms', liteapiIds, q)
}

export async function getFromPrices(liteapiIds: string[], q: StayQuery): Promise<Map<string, Live<Quote>>> {
  const out = new Map<string, Live<Quote>>()
  for (const [id, r] of await ratesFor('from', liteapiIds, q)) {
    out.set(id, r.status === 'live' ? { status: 'live', value: r.value.cheapest } : r)
  }
  return out
}

export async function liveRoomPrice(
  room: { liteapiHotelId: string; liteapiRoomId: string | null; roomType: string },
  q: StayQuery
): Promise<Live<Quote>> {
  const r = (await getRoomRates([room.liteapiHotelId], q)).get(room.liteapiHotelId) ?? UNAVAILABLE
  return r.status === 'live' ? quoteForRoom(r.value, { liteapiRoomId: room.liteapiRoomId, name: room.roomType }) : r
}

export function __clearLiteApiCache(): void {
  store.clear()
}
