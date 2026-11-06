import 'server-only'
import { createAdminClient } from '../../utils/supabase/admin.ts'
import { countNights } from '../../utils/reservation-logic.ts'
import { hotelRowFor, isAdultsOnly, roomRowsFor, samplePricesFor, summaryOf, targetFor, type RoomRow } from './import-mapping.ts'
import { LITEAPI_BASE } from './types.ts'
import type { LiteHotelDetail, LiteOffer, LiteRatesRequest, LiteRatesResponse } from './types.ts'

const MAX_ROOMS = 10
const SAMPLE_DAYS_AHEAD = 30

// LiteAPI ids look like lp1beec; anything else is never sent on
export const isLiteapiId = (slug: string) => /^lp[0-9a-z]{1,24}$/i.test(slug)

type Stay = { checkIn: string; checkOut: string }

/** LiteAPI is down or rate limited right now, so the guest should try again rather than hear the stay doesn't exist */
export class LiteApiUnavailable extends Error {}

async function liteapi<T>(path: string, body?: unknown): Promise<T | null> {
  const apiKey = process.env.LITEAPI_KEY
  if (!apiKey) return null
  const endpoint = path.split('?')[0]
  let res: Response
  try {
    res = await fetch(`${LITEAPI_BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-API-Key': apiKey, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    console.warn('[liteapi] request failed', endpoint, error instanceof Error ? error.name : 'error')
    throw new LiteApiUnavailable(endpoint)
  }
  // 204 is LiteAPI's "no availability"
  if (res.status === 204) return null
  if (res.status === 429 || res.status >= 500) {
    console.warn('[liteapi] request failed', endpoint, res.status)
    throw new LiteApiUnavailable(endpoint)
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: { code?: unknown } }) | null
  if (!res.ok) {
    console.warn('[liteapi] request refused', endpoint, res.status, json?.error?.code)
    return null
  }
  return json
}

function nightsFromNow(days: number): Stay {
  const at = (offset: number) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + offset)
    return date.toISOString().slice(0, 10)
  }
  return { checkIn: at(days), checkOut: at(days + 1) }
}

// The stored room prices are only the fallback for when LiteAPI can't quote, so one stay is enough: the guest's own,
// else one night 30 days out
async function sampleOffers(liteapiId: string, stay?: Stay): Promise<{ offers: LiteOffer[]; nights: number } | null> {
  for (const s of stay ? [stay, nightsFromNow(SAMPLE_DAYS_AHEAD)] : [nightsFromNow(SAMPLE_DAYS_AHEAD)]) {
    const request: LiteRatesRequest = {
      hotelIds: [liteapiId],
      occupancies: [{ adults: 2 }],
      currency: 'USD',
      guestNationality: 'US',
      checkin: s.checkIn,
      checkout: s.checkOut,
      timeout: 8,
      roomMapping: true,
      limit: 1,
    }
    const rates = await liteapi<LiteRatesResponse>('/hotels/rates', request)
    const offers = rates?.data?.find((hotel) => hotel?.hotelId === liteapiId)?.roomTypes
    if (offers?.length) return { offers, nights: countNights(s.checkIn, s.checkOut) }
  }
  return null
}

/**
 * Saves a LiteAPI hotel and its room types the way the import does, so the stay page, checkout and My Bookings can use
 * it, and returns its hotels.id. null when it can't be saved: no secret key, LiteAPI doesn't know it, or nothing to
 * price its rooms with. Throws LiteApiUnavailable while LiteAPI is down or rate limited.
 */
export async function saveLiteapiHotel(liteapiId: string, stay?: Stay): Promise<string | null> {
  const db = createAdminClient()
  if (!db || !isLiteapiId(liteapiId)) return null
  const savedId = async () => {
    const { data } = await db.from('hotels').select('id').eq('liteapi_id', liteapiId).maybeSingle()
    return (data?.id as string | undefined) ?? null
  }
  const existing = await savedId()
  if (existing) return existing

  const [detail, sample] = await Promise.all([
    liteapi<{ data?: LiteHotelDetail }>(`/data/hotel?${new URLSearchParams({ hotelId: liteapiId, timeout: '8' })}`),
    sampleOffers(liteapiId, stay),
  ])
  const d = detail?.data
  const prices = sample && samplePricesFor(sample.offers, sample.nights)
  const rooms = d && d.id === liteapiId && !d.deletedAt && prices ? roomRowsFor(d.rooms, prices, MAX_ROOMS, isAdultsOnly(d)) : []
  if (!d || !prices || !rooms.length) {
    console.warn('[liteapi] nothing to save', liteapiId, !d ? 'no details' : !prices ? 'no prices' : 'no rooms')
    return null
  }
  const kept = new Set(rooms.map((room) => room.liteapi_room_id))
  // No sync time: only a sync moves its city's --since auto window
  const hotel = hotelRowFor(targetFor(d), summaryOf(d), d, sample.offers, (d.rooms ?? []).filter((room) => kept.has(String(room.id))), null)

  const { data: inserted, error } = await db.from('hotels').insert(hotel).select('id').single()
  if (error || !inserted) {
    // Another visit may have saved it meanwhile (liteapi_id is unique)
    const other = await savedId()
    if (!other) console.warn('[liteapi] saving hotel failed', liteapiId, error?.code)
    return other
  }
  const { error: roomError } = await db.from('rooms').insert(rooms.map((room) => ({ ...room, hotel_id: inserted.id })))
  if (roomError) {
    console.warn('[liteapi] saving rooms failed', liteapiId, roomError.code)
    // A hotel without rooms reads as "not found" for good, so this call's own row goes and the next visit tries again
    await db.from('hotels').delete().eq('id', inserted.id)
    return null
  }
  return inserted.id as string
}

export type SavedRoom = RoomRow & { id: string }

const ROOM_FIELDS = 'id, liteapi_room_id, room_type, capacity, max_adults, max_children, num_beds, bed_size, price_per_night, tags'
const RETRY_MS = 30 * 60_000
// Rooms asked about lately, saved or not, so page views don't keep asking LiteAPI for the same ones
const tried = new Map<string, number>()

/**
 * Saves the room types LiteAPI offered for a party that the hotel doesn't have yet, priced at `perNight` (by room id),
 * and returns them. A family is often offered other rooms than the 2 adults the hotel was saved for.
 */
export async function saveOfferedRooms(hotelId: string, liteapiId: string, perNight: Map<string, number>): Promise<SavedRoom[]> {
  const db = createAdminClient()
  const now = Date.now()
  for (const [key, until] of tried) if (until <= now) tried.delete(key)
  const ids = [...perNight.keys()].filter((id) => !tried.has(`${liteapiId}|${id}`))
  if (!db || !isLiteapiId(liteapiId) || !ids.length) return []
  for (const id of ids) tried.set(`${liteapiId}|${id}`, now + RETRY_MS)

  let d: LiteHotelDetail | undefined
  try {
    d = (await liteapi<{ data?: LiteHotelDetail }>(`/data/hotel?${new URLSearchParams({ hotelId: liteapiId, timeout: '8' })}`))?.data
  } catch {
    for (const id of ids) tried.delete(`${liteapiId}|${id}`)
    return []
  }
  if (!d || d.id !== liteapiId) return []
  const offered = new Map(ids.map((id) => [id, perNight.get(id)!]))
  const rows = roomRowsFor(
    (d.rooms ?? []).filter((room) => offered.has(String(room.id))),
    { mapped: true, byRoom: offered, byName: new Map(), cheapest: Math.min(...offered.values()) },
    MAX_ROOMS,
    isAdultsOnly(d)
  )
  if (!rows.length) return []

  // ignoreDuplicates: another visit may be saving the same rooms
  const { error } = await db
    .from('rooms')
    .upsert(rows.map((room) => ({ ...room, hotel_id: hotelId })), { onConflict: 'hotel_id,liteapi_room_id', ignoreDuplicates: true })
  if (error) {
    console.warn('[liteapi] saving offered rooms failed', liteapiId, error.code)
    return []
  }
  const { data } = await db.from('rooms').select(ROOM_FIELDS).eq('hotel_id', hotelId).in('liteapi_room_id', rows.map((room) => room.liteapi_room_id))
  return (data ?? []) as SavedRoom[]
}
