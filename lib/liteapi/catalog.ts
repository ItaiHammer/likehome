import 'server-only'
import { LITEAPI_BASE } from './types.ts'
import type { LiteHotelListing, LitePlace } from './types.ts'

type Entry = { expires: number; value: Promise<unknown> }

const DAY = 24 * 60 * 60_000
const LIST_TTL = 60 * 60_000
const MAX_ENTRIES = 1000
export const LIST_LIMIT = 100

// On globalThis so dev HMR reloads of this module keep the cache
const g = globalThis as typeof globalThis & { __likehomeLiteCatalog?: Map<string, Entry> }
const store = (g.__likehomeLiteCatalog ??= new Map<string, Entry>())

// A failed call (null) leaves the cache, so the next page asks again
function remember<T>(key: string, ttl: number, load: () => Promise<T | null>): Promise<T | null> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T | null>
  if (store.size >= MAX_ENTRIES) {
    for (const [k, entry] of store) if (entry.expires <= now) store.delete(k)
    for (const k of store.keys()) {
      if (store.size < MAX_ENTRIES) break
      store.delete(k)
    }
  }
  const value = load()
  store.set(key, { expires: now + ttl, value })
  value.then((result) => {
    if (result === null) store.delete(key)
  })
  return value
}

async function get<T>(path: string): Promise<T | null> {
  const apiKey = process.env.LITEAPI_KEY
  if (!apiKey) return null
  const route = path.split('?')[0]
  try {
    const res = await fetch(`${LITEAPI_BASE}${path}`, {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      console.warn('[liteapi] catalog failed', res.status, route)
      return null
    }
    return (await res.json()) as T
  } catch (error) {
    console.warn('[liteapi] catalog failed', error instanceof Error ? error.name : 'error', route)
    return null
  }
}

export const catalogEnabled = () => Boolean(process.env.LITEAPI_KEY)

export async function placeSuggestions(text: string): Promise<LitePlace[]> {
  const query = text.trim().replace(/\s+/g, ' ').slice(0, 100)
  if (query.length < 2) return []
  const places = await remember(`places|${query.toLowerCase()}`, DAY, async () => {
    const body = await get<{ data?: LitePlace[] }>(`/data/places?${new URLSearchParams({ textQuery: query })}`)
    return Array.isArray(body?.data) ? body.data.filter((place) => typeof place?.placeId === 'string' && place.placeId !== '') : null
  })
  return places ?? []
}

export async function findPlace(text: string): Promise<LitePlace | null> {
  return (await placeSuggestions(text))[0] ?? null
}

// null when LiteAPI couldn't be asked. A hotel merged into another (primaryHotelId) shows as that one.
export async function hotelsInPlace(placeId: string): Promise<LiteHotelListing[] | null> {
  return remember(`hotels|${placeId}`, LIST_TTL, async () => {
    const body = await get<{ data?: LiteHotelListing[] }>(`/data/hotels?${new URLSearchParams({ placeId, limit: String(LIST_LIMIT) })}`)
    if (!Array.isArray(body?.data)) return null
    return body.data.filter((hotel) =>
      typeof hotel?.id === 'string' && hotel.id !== '' && !hotel.deletedAt && (!hotel.primaryHotelId || hotel.primaryHotelId === hotel.id))
  })
}

// English facility names by id, for the name-based tag rules. Empty when LiteAPI can't be asked.
export async function facilityNames(): Promise<Map<number, string>> {
  const names = await remember('facilities', DAY, async () => {
    const body = await get<{ data?: { facility_id?: unknown; facility?: unknown }[] }>('/data/facilities')
    if (!Array.isArray(body?.data)) return null
    return new Map(body.data.flatMap((f) => (typeof f?.facility_id === 'number' && typeof f.facility === 'string' ? [[f.facility_id, f.facility] as const] : [])))
  })
  return names ?? new Map()
}

export function __clearCatalogCache(): void {
  store.clear()
}
