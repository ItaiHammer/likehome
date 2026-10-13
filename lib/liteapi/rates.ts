import 'server-only'
import { countNights, MAX_NIGHTS, todayUTC } from '../../utils/reservation-logic.ts'
import { LITEAPI_BASE } from './types.ts'
import type { LiteMoney, LiteOffer, LiteRatesRequest, LiteRatesResponse } from './types.ts'

export type StayQuery = { checkIn: string; checkOut: string; guests: number }
export type Quote = { total: number; perNight: number; offerId: string; rateName: string; boardType: string; refundable: boolean; dueAtProperty: number }
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

function quoteOf(offer: LiteOffer, nights: number): Quote | null {
  const rates = offer.rates
  if (!offer.offerId || !Array.isArray(rates) || rates.length === 0) return null
  let sum = 0
  let dueAtProperty = 0
  for (const rate of rates) {
    const amount = usd(rate?.retailRate?.total)
    if (amount === null) return null
    sum += amount
    for (const fee of rate.retailRate?.taxesAndFees ?? []) {
      if (fee?.included === false && fee.currency === 'USD') dueAtProperty += Number(fee.amount) || 0
    }
  }
  const total = cents(sum)
  if (total <= 0) return null
  return {
    total,
    // Unrounded so calculateTotalPrice (nights × perNight, rounded to cents) gives back exactly `total`
    perNight: total / nights,
    offerId: offer.offerId,
    rateName: rates[0].name ?? '',
    boardType: rates[0].boardType ?? '',
    refundable: rates.every((r) => r.cancellationPolicies?.refundableTag === 'RFN'),
    dueAtProperty: cents(dueAtProperty),
  }
}

function keepCheapest(into: Record<string, Quote>, key: string, quote: Quote) {
  if (!Object.hasOwn(into, key) || quote.total < into[key].total) into[key] = quote
}

export function parseRatesResponse(body: LiteRatesResponse, nights: number): Map<string, HotelRates> {
  const out = new Map<string, HotelRates>()
  if (!(nights > 0)) return out
  for (const hotel of Array.isArray(body?.data) ? body.data : []) {
    if (!hotel?.hotelId || !Array.isArray(hotel.roomTypes)) continue
    for (const offer of hotel.roomTypes) {
      const quote = offer ? quoteOf(offer, nights) : null
      if (!quote) continue
      let r = out.get(hotel.hotelId)
      if (!r) out.set(hotel.hotelId, (r = { mapped: false, byRoom: {}, byName: {}, cheapest: quote }))
      else if (quote.total < r.cheapest.total) r.cheapest = quote
      const first = offer.rates![0]
      const roomId = first.mappedRoomId ?? offer.mappedRoomId
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
    occupancies: [{ adults: q.guests }],
    currency: 'USD',
    guestNationality: 'US',
    checkin: q.checkIn,
    checkout: q.checkOut,
    timeout: 6,
    limit: hotelIds.length,
    ...(mode === 'rooms' ? { roomMapping: true } : { maxRatesPerHotel: 1 }),
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
    const parsed = parseRatesResponse({ data }, nights)
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

export const liveRatesEnabled = () => Boolean(process.env.LITEAPI_KEY)

const cacheKey = (mode: Mode, id: string, q: StayQuery) => `${mode}|${id}|${q.checkIn}|${q.checkOut}|${q.guests}`

async function ratesFor(mode: Mode, liteapiIds: string[], q: StayQuery): Promise<Map<string, Live<HotelRates>>> {
  const ids = [...new Set(liteapiIds.filter(Boolean))]
  const apiKey = process.env.LITEAPI_KEY
  const nights = countNights(q.checkIn, q.checkOut)
  if (
    !apiKey ||
    nights < 1 ||
    nights > MAX_NIGHTS ||
    countNights(todayUTC(), q.checkIn) > MAX_DAYS_AHEAD ||
    !Number.isInteger(q.guests) ||
    q.guests < 1
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
