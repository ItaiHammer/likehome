// Imports LiteAPI hotels and room types into `hotels` / `rooms`. Run `npm run import:liteapi -- --help`.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LITEAPI_BASE } from '../lib/liteapi/types.ts'
import type { LiteHotelDetail, LiteHotelSummary, LiteOffer, LiteRatesRequest, LiteRatesResponse } from '../lib/liteapi/types.ts'
import { hotelRowFor, hotelSql, isAdultsOnly, roomRowsFor, samplePricesFor, unmappedFacilities } from '../lib/liteapi/import-mapping.ts'
import type { HotelRow, RoomRow, Target } from '../lib/liteapi/import-mapping.ts'

const TARGETS = {
  sf:  { countryCode: 'US', cityName: 'San Francisco', city: 'San Francisco', region: 'California', country: 'USA' },
  nyc: { countryCode: 'US', cityName: 'New York',      city: 'New York',      region: 'New York',   country: 'USA' },
  mia: { countryCode: 'US', cityName: 'Miami',         city: 'Miami',         region: 'Florida',    country: 'USA' },
  lv:  { countryCode: 'US', cityName: 'Las Vegas',     city: 'Las Vegas',     region: 'Nevada',     country: 'USA' },
  // non-US example: paris: { countryCode:'FR', cityName:'Paris', city:'Paris', region:null, country:'France' }
} as const satisfies Record<string, Target>
type CityKey = keyof typeof TARGETS

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_LIMIT = 200
// The sandbox allows 5 requests per second
const MIN_GAP_MS = 250
const BACKOFF_MS = [1000, 2000, 4000]
const DETAIL_CONCURRENCY = 4
// One rates request for 100 New York hotels came back "no availability" for all of them; 25 at a time price normally
const RATES_BATCH = 25

const USAGE = `Usage: npm run import:liteapi -- [options]
       node --env-file=.env.local scripts/import-liteapi.mts [options]

  --dry-run           fetch and map everything, print a summary, write nothing
  --cities sf,nyc     cities to import (default: ${Object.keys(TARGETS).join(',')})
  --limit 100         hotels listed per city (1-${MAX_LIMIT})
  --max-rooms 10      room types kept per hotel
  --sql-out [path]    write an idempotent .sql file to paste into the SQL Editor instead of
                      writing to Supabase (default: the OS temp folder; paths inside the repo are refused)

Env (.env.local): LITEAPI_KEY, plus NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY unless --dry-run or --sql-out.`

class CliError extends Error {}

type Options = { dryRun: boolean; cities: CityKey[]; limit: number; maxRooms: number; sqlOut: string | null; help: boolean }

function positiveInt(flag: string, raw: string | undefined, max: number): number {
  const value = Number(raw)
  if (!raw || !Number.isInteger(value) || value < 1 || value > max) throw new CliError(`${flag} needs a whole number from 1 to ${max}.`)
  return value
}

function parseOptions(argv: string[]): Options {
  const options: Options = { dryRun: false, cities: Object.keys(TARGETS) as CityKey[], limit: 100, maxRooms: 10, sqlOut: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const eq = argv[i].indexOf('=')
    const flag = eq === -1 ? argv[i] : argv[i].slice(0, eq)
    const inline = eq === -1 ? undefined : argv[i].slice(eq + 1)
    const value = () => inline ?? (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : undefined)
    switch (flag) {
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = positiveInt(flag, value(), MAX_LIMIT); break
      case '--max-rooms': options.maxRooms = positiveInt(flag, value(), 100); break
      case '--sql-out': options.sqlOut = value() ?? ''; break
      case '--help': case '-h': options.help = true; break
      case '--cities': {
        const keys = (value() ?? '').split(',').map((key) => key.trim().toLowerCase()).filter(Boolean)
        const unknown = keys.filter((key) => !(key in TARGETS))
        if (!keys.length || unknown.length) throw new CliError(`--cities takes a comma-separated list of ${Object.keys(TARGETS).join(', ')}${unknown.length ? ` (unknown: ${unknown.join(', ')})` : ''}.`)
        options.cities = [...new Set(keys)] as CityKey[]
        break
      }
      default: throw new CliError(`Unknown option ${argv[i]}\n\n${USAGE}`)
    }
  }
  return options
}

// Resolves junctions/symlinks on the part of the path that exists, so a link into the repo is still caught
function realPath(target: string): string {
  const rest: string[] = []
  let existing = path.resolve(target)
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing)
    if (parent === existing) break
    rest.unshift(path.basename(existing))
    existing = parent
  }
  const real = path.join(fs.realpathSync.native(existing), ...rest)
  return process.platform === 'win32' ? real.toLowerCase() : real
}

function isInside(child: string, parent: string): boolean {
  const rel = path.relative(realPath(parent), realPath(child))
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}

// Fetched data never goes inside the repo, so it can't be committed by accident
function sqlOutPath(raw: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
  const name = `likehome-liteapi-import-${stamp}.sql`
  let target = raw ? path.resolve(raw) : path.join(os.tmpdir(), name)
  if (raw && fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, name)
  if (isInside(target, REPO_ROOT)) {
    throw new CliError(`--sql-out must point outside the repo (${REPO_ROOT}) so fetched data is never committed. Leave the path out to write to ${os.tmpdir()}.`)
  }
  return target
}

let nextSlot = 0
let requestCount = 0

async function throttle() {
  const now = Date.now()
  const at = Math.max(now, nextSlot)
  nextSlot = at + MIN_GAP_MS
  if (at > now) await sleep(at - now)
}

function errorText(text: string): string {
  try {
    const error = (JSON.parse(text) as { error?: { code?: unknown; message?: unknown } } | null)?.error
    return error ? ` (LiteAPI error ${error.code}: ${error.message})` : ''
  } catch {
    return ''
  }
}

// HTTP 204 is checked before parsing: it is LiteAPI's "no availability" and may have no body
async function liteapi<T>(apiKey: string, pathAndQuery: string, body?: unknown): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    await throttle()
    requestCount++
    let status = 0
    let text = ''
    let problem = ''
    try {
      const res = await fetch(`${LITEAPI_BASE}${pathAndQuery}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'X-API-Key': apiKey, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      })
      status = res.status
      if (status === 204) return null
      text = await res.text()
    } catch (err) {
      problem = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    }
    if (!problem && status >= 200 && status < 300) {
      try {
        return (text ? JSON.parse(text) : null) as T
      } catch {
        throw new Error(`HTTP ${status} with a body that is not JSON`)
      }
    }
    const retryable = problem !== '' || status === 429 || status >= 500
    if (!retryable || attempt >= BACKOFF_MS.length) throw new Error(problem || `HTTP ${status}${errorText(text)}`)
    await sleep(BACKOFF_MS[attempt])
  }
}

const isoDay = (offsetDays: number) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

type Imported = { cityKey: CityKey; hotel: HotelRow; rooms: RoomRow[] }

type Report = {
  imported: Imported[]
  skipped: Map<string, number>
  failures: number
  droppedRooms: number
  unmapped: Map<string, number>
}

const label = (s: { id: string; name?: string }) => `${s.id} "${s.name ?? ''}"`

function skip(report: Report, s: { id: string; name?: string }, reason: string) {
  report.skipped.set(reason, (report.skipped.get(reason) ?? 0) + 1)
  console.log(`  skip ${label(s)}: ${reason}`)
}

async function importCity(apiKey: string, cityKey: CityKey, options: Options, seen: Set<string>, report: Report) {
  const target: Target = TARGETS[cityKey]
  console.log(`\n${target.city} (${cityKey})`)

  const query = new URLSearchParams({ countryCode: target.countryCode, cityName: target.cityName, limit: String(options.limit) })
  let listed: LiteHotelSummary[]
  try {
    const list = await liteapi<{ data?: LiteHotelSummary[] }>(apiKey, `/data/hotels?${query}`)
    listed = (list?.data ?? []).filter((s) => typeof s?.id === 'string' && s.id !== '')
  } catch (err) {
    report.failures++
    console.error(`  ! listing hotels failed, skipping ${target.city}: ${(err as Error).message}`)
    return
  }
  console.log(`  ${listed.length} hotels listed`)

  const candidates: LiteHotelSummary[] = []
  for (const s of listed) {
    if (seen.has(s.id)) skip(report, s, 'already imported in this run')
    else if (s.deletedAt) skip(report, s, 'deleted at LiteAPI')
    else {
      seen.add(s.id)
      candidates.push(s)
    }
  }
  if (!candidates.length) return

  const offersByHotel = new Map<string, LiteOffer[]>()
  const unpriced = new Set<string>()
  for (let i = 0; i < candidates.length; i += RATES_BATCH) {
    const batch = candidates.slice(i, i + RATES_BATCH)
    const ratesRequest: LiteRatesRequest = {
      hotelIds: batch.map((s) => s.id),
      occupancies: [{ adults: 2 }],
      currency: 'USD',
      guestNationality: 'US',
      checkin: isoDay(30),
      checkout: isoDay(31),
      timeout: 12,
      roomMapping: true,
      limit: batch.length,
    }
    try {
      // The sandbox sometimes answers a whole batch with "no availability"; asking again usually prices it
      for (let attempt = 0; ; attempt++) {
        const rates = await liteapi<LiteRatesResponse>(apiKey, '/hotels/rates', ratesRequest)
        if (rates?.error && rates.error.code !== 2001) throw new Error(`LiteAPI error ${rates.error.code}: ${rates.error.message}`)
        if (rates?.data?.length || attempt === 1) {
          for (const entry of rates?.data ?? []) offersByHotel.set(entry.hotelId, entry.roomTypes ?? [])
          break
        }
        console.log(`  no prices for a batch of ${batch.length}, asking again`)
        await sleep(BACKOFF_MS[0])
      }
    } catch (err) {
      report.failures++
      console.error(`  ! sample rates failed for ${batch.length} ${target.city} hotels: ${(err as Error).message}`)
      for (const s of batch) unpriced.add(s.id)
    }
  }

  const priced = candidates.flatMap((s) => {
    const sample = samplePricesFor(offersByHotel.get(s.id))
    if (!sample) {
      skip(report, s, unpriced.has(s.id) ? 'sample rates request failed' : 'no priced sample rate')
      return []
    }
    return [{ s, sample }]
  })

  const details = await mapLimit(priced, DETAIL_CONCURRENCY, async ({ s }) => {
    try {
      const detail = await liteapi<{ data?: LiteHotelDetail }>(apiKey, `/data/hotel?${new URLSearchParams({ hotelId: s.id, timeout: '8' })}`)
      return detail?.data ?? null
    } catch (err) {
      report.failures++
      console.error(`  ! details for ${label(s)} failed: ${(err as Error).message}`)
      return undefined
    }
  })

  priced.forEach(({ s, sample }, i) => {
    const d = details[i]
    if (d === undefined) return skip(report, s, 'details request failed')
    if (d === null) return skip(report, s, 'no details')
    if (d.deletedAt) return skip(report, s, 'deleted at LiteAPI')
    const rooms = roomRowsFor(d.rooms, sample, options.maxRooms, isAdultsOnly(d))
    if (!rooms.length) return skip(report, s, 'no rooms')
    const kept = new Set(rooms.map((room) => room.liteapi_room_id))
    const keptRooms = (d.rooms ?? []).filter((room) => kept.has(String(room.id)))
    report.droppedRooms += Math.max(0, (d.rooms ?? []).length - rooms.length)
    const hotel = hotelRowFor(target, s, d, offersByHotel.get(s.id), keptRooms)
    for (const name of unmappedFacilities(d)) report.unmapped.set(name, (report.unmapped.get(name) ?? 0) + 1)
    report.imported.push({ cityKey, hotel, rooms })
    console.log(`  ok   ${label(s)}: ${rooms.length} room types, tags [${hotel.tags.join(', ')}]`)
  })
}

async function writeToSupabase(db: SupabaseClient, imported: Imported[], report: Report) {
  console.log('\nWriting to Supabase')
  let written = 0
  for (const { hotel, rooms } of imported) {
    const { data: h, error } = await db.from('hotels').upsert(hotel, { onConflict: 'liteapi_id' }).select('id').single()
    if (error || !h) {
      report.failures++
      console.error(`  ! ${hotel.liteapi_id}: hotel upsert failed: ${error?.message ?? 'no row returned'}`)
      continue
    }
    const { error: roomError } = await db.from('rooms')
      .upsert(rooms.map((room) => ({ ...room, hotel_id: h.id })), { onConflict: 'hotel_id,liteapi_room_id' })
    if (roomError) {
      report.failures++
      console.error(`  ! ${hotel.liteapi_id}: room upsert failed: ${roomError.message}`)
      continue
    }
    written++
    // Never deleted: reservations.room_id points at rooms
    const { data: existing } = await db.from('rooms').select('liteapi_room_id, room_type').eq('hotel_id', h.id)
    const kept = new Set(rooms.map((room) => room.liteapi_room_id))
    const stale = (existing ?? []).filter((room) => !kept.has(room.liteapi_room_id))
    if (stale.length) console.log(`  ${hotel.liteapi_id}: kept ${stale.length} room(s) this run didn't import: ${stale.map((room) => room.room_type).join('; ')}`)
  }
  console.log(`  ${written} of ${imported.length} hotels written`)
}

function printSummary(options: Options, report: Report) {
  const roomCount = report.imported.reduce((sum, item) => sum + item.rooms.length, 0)
  console.log(`\nSummary: ${report.imported.length} hotels, ${roomCount} room types mapped, ${requestCount} LiteAPI requests`)
  for (const [reason, n] of report.skipped) console.log(`  skipped ${n}: ${reason}`)
  if (report.droppedRooms) console.log(`  ${report.droppedRooms} room types left out by --max-rooms ${options.maxRooms} or missing an id/name`)
  if (report.unmapped.size) {
    console.log(`\nFacility names no tag rule matched (${report.unmapped.size}):`)
    for (const [name, n] of [...report.unmapped].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) console.log(`  ${n}x ${name}`)
  }
}

async function main(options: Options) {
  if (options.help) return console.log(USAGE)

  const apiKey = process.env.LITEAPI_KEY?.trim()
  if (!apiKey) {
    throw new CliError('LITEAPI_KEY is not set. Add LITEAPI_KEY=<your LiteAPI sandbox key> to .env.local and run it with node --env-file=.env.local (npm run import:liteapi does).')
  }
  if (options.dryRun && options.sqlOut !== null) console.log('--dry-run writes nothing, so --sql-out is ignored.')
  const sqlOut = !options.dryRun && options.sqlOut !== null ? sqlOutPath(options.sqlOut) : null

  let db: SupabaseClient | null = null
  if (!options.dryRun && sqlOut === null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const secret = process.env.SUPABASE_SECRET_KEY?.trim()
    if (!secret) throw new CliError('SUPABASE_SECRET_KEY is not set, so nothing can be written. Add it to .env.local, or use --dry-run or --sql-out.')
    if (!url) throw new CliError('NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local.')
    db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  }

  const report: Report = { imported: [], skipped: new Map(), failures: 0, droppedRooms: 0, unmapped: new Map() }
  const seen = new Set<string>()
  for (const cityKey of options.cities) await importCity(apiKey, cityKey, options, seen, report)

  if (options.dryRun) {
    console.log('\nFirst mapped rows (dry run, nothing written):')
    for (const item of report.imported.slice(0, 2)) console.log(JSON.stringify(item, null, 2))
  } else if (sqlOut !== null) {
    const header = `-- LiteAPI import for ${options.cities.join(', ')}, generated ${new Date().toISOString()}.\n` +
      '-- Run supabase/migrations/liteapi_hotels.sql first. Safe to re-run: rows are updated in place and rooms are never deleted.\n' +
      '-- Do not paste it over newer data (a later import or sync): its hotels would go back to this copy, and any LiteAPI\n' +
      '-- removed since would show in search again.\n'
    const sql = `${header}begin;\n\n${report.imported.map((item) => hotelSql(item.hotel, item.rooms)).join('\n')}\ncommit;\n`
    fs.mkdirSync(path.dirname(sqlOut), { recursive: true })
    fs.writeFileSync(sqlOut, sql)
    console.log(`\nWrote ${report.imported.length} hotels to ${sqlOut}`)
  } else if (db) {
    await writeToSupabase(db, report.imported, report)
  }

  printSummary(options, report)
  if (report.failures) {
    console.error(`\n${report.failures} request(s) or write(s) failed; see the log above.`)
    process.exitCode = 1
  }
}

try {
  await main(parseOptions(process.argv.slice(2)))
} catch (err) {
  console.error(err instanceof CliError ? err.message : err)
  process.exitCode = 1
}
