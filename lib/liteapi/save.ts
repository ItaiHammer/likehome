import 'server-only'
import { createAdminClient } from '../../utils/supabase/admin.ts'
import { countNights } from '../../utils/reservation-logic.ts'
import { hotelRowFor, isAdultsOnly, roomRowsFor, samplePricesFor, summaryOf, targetFor } from './import-mapping.ts'
import { LITEAPI_BASE } from './types.ts'
import type { LiteHotelDetail, LiteOffer, LiteRatesRequest, LiteRatesResponse } from './types.ts'

const MAX_ROOMS = 10
const SAMPLE_DAYS_AHEAD = 30

// LiteAPI ids look like lp1beec; anything else is never sent on
export const isLiteapiId = (slug: string) => /^lp[0-9a-z]{1,24}$/i.test(slug)

type Stay = { checkIn: string; checkOut: string }

async function liteapi<T>(path: string, body?: unknown): Promise<T | null> {
  const apiKey = process.env.LITEAPI_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`${LITEAPI_BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-API-Key': apiKey, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    // 204 is LiteAPI's "no availability"
    if (!res.ok || res.status === 204) return null
    return (await res.json()) as T
  } catch {
    return null
  }
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
 * price its rooms with.
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
  if (!d || d.id !== liteapiId || d.deletedAt || !prices) return null

  const rooms = roomRowsFor(d.rooms, prices, MAX_ROOMS, isAdultsOnly(d))
  if (!rooms.length) return null
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
