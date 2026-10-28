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
import {
  AUTO_MAX_DAYS, AUTO_OVERLAP_DAYS, autoSince, hotelListQuery, hotelRowFor, hotelSql, isAdultsOnly, parseSince, planSync, removedAt, rfc3339, roomRowsFor,
  outsideTargets, sameCity, samplePricesFor, savedTarget, typicalPrices, unmappedFacilities,
} from '../lib/liteapi/import-mapping.ts'
import type { Existing, HotelRow, RoomRow, SavedRow, Target } from '../lib/liteapi/import-mapping.ts'
import { stateFromZip } from '../lib/us-states.ts'
import { CITY_RADIUS_KM, farFrom } from '../lib/liteapi/near.ts'

type ImportTarget = Target & { center: readonly [number, number] }

// Popular destinations only; live search covers everywhere else. cityName is what LiteAPI lists the place under, city
// the destination picker's spelling (search.ts maps the other way). Outside the US there's no region, and the country is
// the English name Intl.DisplayNames gives ("United Kingdom"). Hotels more than CITY_RADIUS_KM from center are skipped.
const TARGETS = {
  sf:         { countryCode: 'US', cityName: 'San Francisco',    city: 'San Francisco', region: 'California', country: 'USA', center: [37.7749, -122.4194] },
  nyc:        { countryCode: 'US', cityName: 'New York',         city: 'New York',      region: 'New York',   country: 'USA', center: [40.7128, -74.006] },
  mia:        { countryCode: 'US', cityName: 'Miami',            city: 'Miami',         region: 'Florida',    country: 'USA', center: [25.7617, -80.1918] },
  lv:         { countryCode: 'US', cityName: 'Las Vegas',        city: 'Las Vegas',     region: 'Nevada',     country: 'USA', center: [36.1699, -115.1398] },
  orlando:    { countryCode: 'US', cityName: 'Orlando',          city: 'Orlando',       region: 'Florida',    country: 'USA', center: [28.5383, -81.3792] },
  la:         { countryCode: 'US', cityName: 'Los Angeles',      city: 'Los Angeles',   region: 'California', country: 'USA', center: [34.0522, -118.2437] },
  chicago:    { countryCode: 'US', cityName: 'Chicago',          city: 'Chicago',       region: 'Illinois',   country: 'USA', center: [41.8781, -87.6298] },
  honolulu:   { countryCode: 'US', cityName: 'Honolulu',         city: 'Honolulu',      region: 'Hawaii',     country: 'USA', center: [21.3069, -157.8583] },
  seattle:    { countryCode: 'US', cityName: 'Seattle',          city: 'Seattle',       region: 'Washington', country: 'USA', center: [47.6062, -122.3321] },
  sedona:     { countryCode: 'US', cityName: 'Sedona',           city: 'Sedona',        region: 'Arizona',    country: 'USA', center: [34.8697, -111.761] },
  aspen:      { countryCode: 'US', cityName: 'Aspen',            city: 'Aspen',         region: 'Colorado',   country: 'USA', center: [39.1911, -106.8175] },
  tahoe:      { countryCode: 'US', cityName: 'South Lake Tahoe', city: 'Lake Tahoe',    region: 'California', country: 'USA', center: [38.9399, -119.9772] },
  monterey:   { countryCode: 'US', cityName: 'Monterey',         city: 'Monterey',      region: 'California', country: 'USA', center: [36.6002, -121.8947] },
  santacruz:  { countryCode: 'US', cityName: 'Santa Cruz',       city: 'Santa Cruz',    region: 'California', country: 'USA', center: [36.9741, -122.0308] },
  lakeplacid: { countryCode: 'US', cityName: 'Lake Placid',      city: 'Lake Placid',   region: 'New York',   country: 'USA', center: [44.2795, -73.9799] },
  paris:      { countryCode: 'FR', cityName: 'Paris',     city: 'Paris',     region: null, country: 'France',               center: [48.8566, 2.3522] },
  london:     { countryCode: 'GB', cityName: 'London',    city: 'London',    region: null, country: 'United Kingdom',       center: [51.5074, -0.1278] },
  tokyo:      { countryCode: 'JP', cityName: 'Tokyo',     city: 'Tokyo',     region: null, country: 'Japan',                center: [35.6762, 139.6503] },
  rome:       { countryCode: 'IT', cityName: 'Rome',      city: 'Rome',      region: null, country: 'Italy',                center: [41.9028, 12.4964] },
  barcelona:  { countryCode: 'ES', cityName: 'Barcelona', city: 'Barcelona', region: null, country: 'Spain',                center: [41.3874, 2.1686] },
  kyoto:      { countryCode: 'JP', cityName: 'Kyoto',     city: 'Kyoto',     region: null, country: 'Japan',                center: [35.0116, 135.7681] },
  lisbon:     { countryCode: 'PT', cityName: 'Lisbon',    city: 'Lisbon',    region: null, country: 'Portugal',             center: [38.7223, -9.1393] },
  reykjavik:  { countryCode: 'IS', cityName: 'Reykjavik', city: 'Reykjavík', region: null, country: 'Iceland',              center: [64.1466, -21.9426] },
  lucerne:    { countryCode: 'CH', cityName: 'Luzern',    city: 'Lucerne',   region: null, country: 'Switzerland',          center: [47.0502, 8.3093] },
  bali:       { countryCode: 'ID', cityName: 'Ubud',      city: 'Bali',      region: null, country: 'Indonesia',            center: [-8.5069, 115.2625] },
  banff:      { countryCode: 'CA', cityName: 'Banff',     city: 'Banff',     region: null, country: 'Canada',               center: [51.1784, -115.5708] },
  santorini:  { countryCode: 'GR', cityName: 'Santorini', city: 'Santorini', region: null, country: 'Greece',               center: [36.3932, 25.4615] },
  cancun:     { countryCode: 'MX', cityName: 'Cancun',    city: 'Cancún',    region: null, country: 'Mexico',               center: [21.1619, -86.8515] },
  dubai:      { countryCode: 'AE', cityName: 'Dubai',     city: 'Dubai',     region: null, country: 'United Arab Emirates', center: [25.2048, 55.2708] },
  bangkok:    { countryCode: 'TH', cityName: 'Bangkok',   city: 'Bangkok',   region: null, country: 'Thailand',             center: [13.7563, 100.5018] },
} as const satisfies Record<string, ImportTarget>
type CityKey = keyof typeof TARGETS

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_LIMIT = 200
// The sandbox allows 5 requests per second
const MIN_GAP_MS = 250
const BACKOFF_MS = [1000, 2000, 4000]
const DETAIL_CONCURRENCY = 4
// One rates request for 100 New York hotels came back "no availability" for all of them; 25 at a time price normally
const RATES_BATCH = 25
// One-night samples starting 30 days out; a week counts every weekday once
const SAMPLE_NIGHTS = 7
// /data/hotels takes up to 5000 per request; --since pages through every hotel updated in the window, up to this cap
const SYNC_PAGE_SIZE = 1000
const SYNC_MAX_PAGES = 5
// Supabase returns at most 1000 rows per request by default
const DB_PAGE = 1000

const USAGE = `Usage: npm run import:liteapi -- [options]
       node --env-file=.env.local scripts/import-liteapi.mts [options]

  --dry-run           fetch and map everything, print a summary, write nothing
  --cities sf,nyc     cities to import (default: ${Object.keys(TARGETS).join(',')}).
                      Nothing is written until every city is done, so import a few at a time
  --limit 100         hotels listed per city (1-${MAX_LIMIT})
  --max-rooms 10      room types kept per hotel
  --sql-out [path]    write an idempotent .sql file to paste into the SQL Editor instead of
                      writing to Supabase (default: the OS temp folder; paths inside the repo are refused)
  --since auto        refresh instead: list only hotels LiteAPI updated since an ISO timestamp, 48h, 7d, or auto
                      (each city's last sync minus ${AUTO_OVERLAP_DAYS} days, so later runs retry what a run missed,
                      but at most ${AUTO_MAX_DAYS} days back, which is also where a city never synced starts).
                      Updates hotels already imported, hides ones LiteAPI deleted (adding the hotel one was merged
                      into), and adds up to --max-new other new hotels per city
  --max-new 5         with --since, new hotels added per city (0-100), not counting merged-into ones
  --max-saved 25      with --since, also refresh this many saved hotels outside those cities (0-200), longest
                      unsynced first. Live search saves hotels from anywhere, and no city's change list covers them.

Env (.env.local): LITEAPI_KEY, plus NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY unless --dry-run or --sql-out.
A --since --dry-run reads (never writes) Supabase when both are set, to tell imported hotels from new ones.`

class CliError extends Error {}

type Options = {
  dryRun: boolean; cities: CityKey[]; limit: number; maxRooms: number; sqlOut: string | null; help: boolean
  since: Date | 'auto' | null; maxNew: number; maxSaved: number
}

function wholeNumber(flag: string, raw: string | undefined, max: number, min = 1): number {
  const value = Number(raw)
  if (!raw || !Number.isInteger(value) || value < min || value > max) throw new CliError(`${flag} needs a whole number from ${min} to ${max}.`)
  return value
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    dryRun: false, cities: Object.keys(TARGETS) as CityKey[], limit: 100, maxRooms: 10, sqlOut: null, help: false, since: null, maxNew: 5,
    maxSaved: 25,
  }
  const given = new Set<string>()
  for (let i = 0; i < argv.length; i++) {
    const eq = argv[i].indexOf('=')
    const flag = eq === -1 ? argv[i] : argv[i].slice(0, eq)
    const inline = eq === -1 ? undefined : argv[i].slice(eq + 1)
    const value = () => inline ?? (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : undefined)
    given.add(flag)
    switch (flag) {
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = wholeNumber(flag, value(), MAX_LIMIT); break
      case '--max-rooms': options.maxRooms = wholeNumber(flag, value(), 100); break
      case '--sql-out': options.sqlOut = value() ?? ''; break
      case '--help': case '-h': options.help = true; break
      case '--max-new': options.maxNew = wholeNumber(flag, value(), 100, 0); break
      case '--max-saved': options.maxSaved = wholeNumber(flag, value(), 200, 0); break
      case '--since': {
        options.since = parseSince(value())
        if (options.since === null) throw new CliError('--since takes auto, a number of hours or days (48h, 7d) or a past ISO timestamp such as 2026-10-08T00:00:00Z.')
        break
      }
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
  if (options.since === null && given.has('--max-new')) throw new CliError('--max-new only applies with --since.')
  if (options.since === null && given.has('--max-saved')) throw new CliError('--max-saved only applies with --since.')
  if (options.since !== null && given.has('--limit')) {
    throw new CliError('--limit does not apply with --since, which lists every hotel updated in the window. Use --max-new to cap new hotels.')
  }
  if (options.since !== null && options.sqlOut !== null && !options.dryRun) {
    throw new CliError('--since needs Supabase to tell imported hotels from new ones, so it cannot write --sql-out. Use --dry-run to preview it.')
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

type Imported = { place: string; hotel: HotelRow; rooms: RoomRow[] }

type Removed = { liteapi_id: string; at: string }

type Report = {
  imported: Imported[]
  removed: Removed[]
  skipped: Map<string, number>
  failures: number
  droppedRooms: number
  unmapped: Map<string, number>
  // Saved hotels a run looked at but couldn't refresh: their liteapi_synced_at still moves on, so the rotation does too
  checked: string[]
}

// at: when the run started, every row's liteapi_synced_at, so --since auto never skips what changed during a run.
// existing: with --since, the hotels already imported (null without a database).
type Run = { at: string; existing: Existing | null }

const label = (s: { id: string; name?: string }) => `${s.id} "${s.name ?? ''}"`

const tally = (report: Report, reason: string, n = 1) => report.skipped.set(reason, (report.skipped.get(reason) ?? 0) + n)

function skip(report: Report, s: { id: string; name?: string }, reason: string) {
  tally(report, reason)
  console.log(`  skip ${label(s)}: ${reason}`)
}

function hide(report: Report, s: LiteHotelSummary, at: string) {
  report.removed.push({ liteapi_id: s.id, at })
  console.log(`  hide ${label(s)}: deleted at LiteAPI ${at}${s.primaryHotelId ? `, merged into ${s.primaryHotelId}` : ''}`)
}

const hasId = (s: LiteHotelSummary) => typeof s?.id === 'string' && s.id !== ''

async function importCity(apiKey: string, cityKey: CityKey, options: Options, seen: Set<string>, report: Report, run: Run) {
  const target: ImportTarget = TARGETS[cityKey]
  console.log(`\n${target.city} (${cityKey})`)

  let listed: LiteHotelSummary[]
  try {
    const list = await liteapi<{ data?: LiteHotelSummary[] }>(apiKey, `/data/hotels?${hotelListQuery(target, options.limit)}`)
    listed = (list?.data ?? []).filter(hasId)
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
    else if (farFrom(s, target.center)) skip(report, s, `more than ${CITY_RADIUS_KM} km from the city`)
    else {
      seen.add(s.id)
      candidates.push(s)
    }
  }
  await importHotels(apiKey, target.city, () => target, candidates, options, report, run)
}

async function sinceFor(db: SupabaseClient | null, target: Target, since: Date | 'auto'): Promise<Date> {
  if (since !== 'auto') return since
  let last: string | null = null
  if (db) {
    // Only LiteAPI rows: owners can edit every column of their own listings
    let query = db.from('hotels').select('liteapi_synced_at').eq('city', target.city).eq('country', target.country)
      .not('liteapi_id', 'is', null).not('liteapi_synced_at', 'is', null)
    if (target.region) query = query.eq('region', target.region)
    const { data, error } = await query.order('liteapi_synced_at', { ascending: false }).limit(1)
    if (error) throw new CliError(`Reading hotels.liteapi_synced_at failed: ${error.message}. Has supabase/migrations/liteapi_hotels.sql been run?`)
    last = data?.[0]?.liteapi_synced_at ?? null
  }
  const at = autoSince(last)
  const from = last ? `last sync ${last} minus ${AUTO_OVERLAP_DAYS} days, at most ${AUTO_MAX_DAYS} back` : `${db ? 'no earlier sync' : 'no database'}, so the last ${AUTO_MAX_DAYS} days`
  console.log(`  --since auto: ${from} (${rfc3339(at)})`)
  return at
}

// null when listing failed. Offset paging can shift while LiteAPI updates hotels, so ids are de-duplicated.
async function listUpdated(apiKey: string, target: Target, since: Date, report: Report): Promise<LiteHotelSummary[] | null> {
  const byId = new Map<string, LiteHotelSummary>()
  let total: number | undefined
  for (let page = 0; page < SYNC_MAX_PAGES; page++) {
    let data: LiteHotelSummary[]
    try {
      const list = await liteapi<{ data?: LiteHotelSummary[]; total?: number }>(apiKey,
        `/data/hotels?${hotelListQuery(target, SYNC_PAGE_SIZE, since, page * SYNC_PAGE_SIZE)}`)
      data = list?.data ?? []
      total ??= list?.total
    } catch (err) {
      report.failures++
      console.error(`  ! listing hotels failed, skipping ${target.city}: ${(err as Error).message}`)
      return null
    }
    for (const s of data) if (hasId(s) && !byId.has(s.id)) byId.set(s.id, s)
    if (data.length < SYNC_PAGE_SIZE) {
      console.log(`  ${byId.size} hotels updated since ${rfc3339(since)}${total === undefined ? '' : ` (LiteAPI total ${total})`}`)
      if (total !== undefined && byId.size < total) {
        report.failures++
        console.error(`  ! LiteAPI counted ${total} but listed ${byId.size}; the next runs list this window again`)
      }
      return [...byId.values()]
    }
  }
  // Counted as a failure: the next run's window starts later, so hotels past the cap could be missed for good
  report.failures++
  console.error(`  ! stopped after ${SYNC_MAX_PAGES} pages of ${SYNC_PAGE_SIZE} (LiteAPI total ${total ?? 'unknown'}); run again with an earlier --since`)
  return [...byId.values()]
}

async function syncCity(
  apiKey: string, db: SupabaseClient | null, cityKey: CityKey, options: Options, seen: Set<string>, report: Report, run: Run,
) {
  const target: ImportTarget = TARGETS[cityKey]
  console.log(`\n${target.city} (${cityKey})`)
  const listed = await listUpdated(apiKey, target, await sinceFor(db, target, options.since!), report)
  if (!listed) return

  const fresh = unseen(listed, seen, report)
  let plan = planSync(fresh, run.existing, options.maxNew, run.at)
  if (plan.unlisted.length) {
    fresh.push(...unseen(await mergedInto(apiKey, plan.unlisted, report), seen, report))
    plan = planSync(fresh, run.existing, options.maxNew, run.at)
  }
  for (const s of plan.unlisted) {
    tally(report, 'merged into a hotel LiteAPI does not list in the same city')
    console.log(`  skip ${s.primaryHotelId}: ${label(s)} was merged into it, but LiteAPI does not list it in the same city`)
  }
  for (const { s, at } of plan.remove) hide(report, s, at)
  // Hundreds of hotels can be over the cap, so skips are one line per reason here
  const reasons = new Map<string, number>()
  for (const { reason } of plan.skip) reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
  for (const [reason, n] of reasons) {
    tally(report, reason, n)
    console.log(`  skip ${n}: ${reason}`)
  }
  const near = [...plan.update, ...plan.add].filter((s) => {
    if (!farFrom(s, target.center)) return true
    skip(report, s, `more than ${CITY_RADIUS_KM} km from the city`)
    return false
  })
  console.log(`  ${plan.update.length} to update, ${plan.add.length} new`)
  await importHotels(apiKey, target.city, () => target, near, options, report, run)
}

// Live search saves hotels from anywhere, and no city's change list covers those, so each run refreshes the few saved
// longest ago by id. Their stored city, region and country stay as they are.
async function refreshSaved(apiKey: string, db: SupabaseClient | null, options: Options, seen: Set<string>, report: Report, run: Run) {
  if (!options.maxSaved) return
  console.log('\nSaved hotels outside the import cities')
  if (!db) return console.log('  skipped: no database to read them from')
  const { data, error } = await db.from('hotels').select('liteapi_id, city, region, country')
    .not('liteapi_id', 'is', null).is('liteapi_deleted_at', null).not('city', 'is', null).or(outsideTargets(Object.values(TARGETS)))
    .order('liteapi_synced_at', { ascending: true, nullsFirst: true }).limit(options.maxSaved)
  if (error) {
    report.failures++
    console.error(`  ! reading saved hotels failed: ${error.message}`)
    return
  }
  const rows = ((data ?? []) as SavedRow[]).filter((row) => !seen.has(row.liteapi_id))
  if (!rows.length) return console.log('  none')
  for (const row of rows) seen.add(row.liteapi_id)

  let listed: LiteHotelSummary[]
  try {
    const list = await liteapi<{ data?: LiteHotelSummary[] }>(apiKey,
      `/data/hotels?${new URLSearchParams({ hotelIds: rows.map((row) => row.liteapi_id).join(','), limit: String(rows.length) })}`)
    listed = (list?.data ?? []).filter(hasId)
  } catch (err) {
    report.failures++
    console.error(`  ! listing saved hotels failed: ${(err as Error).message}`)
    return
  }
  const targets = new Map(rows.map((row) => [row.liteapi_id, savedTarget(row)]))
  const candidates: LiteHotelSummary[] = []
  for (const s of listed) {
    if (!targets.has(s.id)) continue
    if (s.deletedAt) hide(report, s, removedAt(s.deletedAt, run.at))
    else candidates.push(s)
  }
  console.log(`  ${rows.length} longest unsynced, ${candidates.length} to refresh`)
  await importHotels(apiKey, 'saved hotels', (s) => targets.get(s.id)!, candidates, options, report, run)

  const done = new Set([...report.imported.map((item) => item.hotel.liteapi_id), ...report.removed.map((item) => item.liteapi_id)])
  report.checked.push(...rows.map((row) => row.liteapi_id).filter((id) => !done.has(id)))
}

function unseen(listed: LiteHotelSummary[], seen: Set<string>, report: Report): LiteHotelSummary[] {
  return listed.filter((s) => {
    if (seen.has(s.id)) {
      skip(report, s, 'already imported in this run')
      return false
    }
    seen.add(s.id)
    return true
  })
}

// Looked up by id. One in another city than the hotel merged into it is left out: its row would get this city's name.
async function mergedInto(apiKey: string, merged: LiteHotelSummary[], report: Report): Promise<LiteHotelSummary[]> {
  const from = new Map(merged.map((s) => [s.primaryHotelId!, s]))
  try {
    const list = await liteapi<{ data?: LiteHotelSummary[] }>(apiKey,
      `/data/hotels?${new URLSearchParams({ hotelIds: [...from.keys()].join(','), limit: String(from.size) })}`)
    return (list?.data ?? []).filter((s) => hasId(s) && from.has(s.id) && sameCity(s, from.get(s.id)!))
  } catch (err) {
    report.failures++
    console.error(`  ! looking up the hotels ours were merged into failed: ${(err as Error).message}`)
    return []
  }
}

async function importHotels(
  apiKey: string, place: string, targetOf: (s: LiteHotelSummary) => Target, candidates: LiteHotelSummary[], options: Options,
  report: Report, run: Run,
) {
  if (!candidates.length) return

  const offersByHotel = new Map<string, LiteOffer[][]>()
  const unpriced = new Set<string>()
  for (let i = 0; i < candidates.length; i += RATES_BATCH) {
    const batch = candidates.slice(i, i + RATES_BATCH)
    for (let night = 0; night < SAMPLE_NIGHTS; night++) {
      const ratesRequest: LiteRatesRequest = {
        hotelIds: batch.map((s) => s.id),
        occupancies: [{ adults: 2 }],
        currency: 'USD',
        guestNationality: 'US',
        checkin: isoDay(30 + night),
        checkout: isoDay(31 + night),
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
            for (const entry of rates?.data ?? []) offersByHotel.set(entry.hotelId, [...(offersByHotel.get(entry.hotelId) ?? []), entry.roomTypes ?? []])
            break
          }
          console.log(`  no prices for a batch of ${batch.length} on ${ratesRequest.checkin}, asking again`)
          await sleep(BACKOFF_MS[0])
        }
      } catch (err) {
        report.failures++
        console.error(`  ! sample rates for ${ratesRequest.checkin} failed for ${batch.length} ${place} hotels: ${(err as Error).message}`)
        for (const s of batch) unpriced.add(s.id)
      }
    }
  }

  const priced = candidates.flatMap((s) => {
    const sample = typicalPrices((offersByHotel.get(s.id) ?? []).map((offers) => samplePricesFor(offers)))
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
    if (d.deletedAt) {
      if (run.existing?.has(s.id) && !run.existing.get(s.id)) return hide(report, s, removedAt(d.deletedAt, run.at))
      return skip(report, s, 'deleted at LiteAPI')
    }
    const target = targetOf(s)
    // Close by but across a state line, when the zip names the state
    const state = target.countryCode === 'US' && target.region ? stateFromZip(d.zip) : null
    if (state && state !== target.region) return skip(report, s, 'in another state')
    const rooms = roomRowsFor(d.rooms, sample, options.maxRooms, isAdultsOnly(d))
    if (!rooms.length) return skip(report, s, 'no rooms')
    const kept = new Set(rooms.map((room) => room.liteapi_room_id))
    const keptRooms = (d.rooms ?? []).filter((room) => kept.has(String(room.id)))
    report.droppedRooms += Math.max(0, (d.rooms ?? []).length - rooms.length)
    const hotel = hotelRowFor(target, s, d, offersByHotel.get(s.id)?.flat(), keptRooms, run.at)
    for (const name of unmappedFacilities(d)) report.unmapped.set(name, (report.unmapped.get(name) ?? 0) + 1)
    report.imported.push({ place, hotel, rooms })
    console.log(`  ok   ${label(s)}: ${rooms.length} room types, tags [${hotel.tags.join(', ')}]`)
  })
}

async function writeToSupabase(db: SupabaseClient, imported: Imported[], report: Report, syncedAt: string) {
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
    await dropStaleRooms(db, h.id, hotel.liteapi_id, rooms, report)
  }
  console.log(`  ${written} of ${imported.length} hotels written`)

  if (report.checked.length) {
    // Saved hotels sit outside every import city, so this never moves a city's --since auto window
    const { error } = await db.from('hotels').update({ liteapi_synced_at: syncedAt }).in('liteapi_id', report.checked)
    if (error) {
      report.failures++
      console.error(`  ! marking ${report.checked.length} saved hotels checked failed: ${error.message}`)
    }
  }

  if (!report.removed.length) return
  let hidden = 0
  for (const { liteapi_id, at } of report.removed) {
    // Not liteapi_synced_at: only imported hotels move a city's --since auto window, so failed imports aren't skipped over
    const { error } = await db.from('hotels').update({ liteapi_deleted_at: at })
      .eq('liteapi_id', liteapi_id).is('liteapi_deleted_at', null)
    if (error) {
      report.failures++
      console.error(`  ! ${liteapi_id}: marking removed failed: ${error.message}`)
      continue
    }
    hidden++
  }
  console.log(`  ${hidden} of ${report.removed.length} removed hotels hidden from search`)
}

// A room type a run didn't import keeps its old sample price (once $3 a night), so it goes. One a reservation points
// at has to stay, and takes the hotel's cheapest current price instead.
async function dropStaleRooms(db: SupabaseClient, hotelId: string, liteapiId: string, rooms: RoomRow[], report: Report) {
  const kept = new Set(rooms.map((room) => room.liteapi_room_id))
  const { data: existing, error } = await db.from('rooms').select('id, liteapi_room_id').eq('hotel_id', hotelId)
  if (error) {
    report.failures++
    console.error(`  ! ${liteapiId}: reading its rooms failed: ${error.message}`)
    return
  }
  const stale = (existing ?? []).filter((room) => room.liteapi_room_id && !kept.has(room.liteapi_room_id)).map((room) => room.id as string)
  if (!stale.length) return
  const { data: booked, error: bookedError } = await db.from('reservations').select('room_id').in('room_id', stale)
  if (bookedError) {
    report.failures++
    console.error(`  ! ${liteapiId}: reading reservations failed: ${bookedError.message}`)
    return
  }
  const keep = [...new Set((booked ?? []).map((reservation) => reservation.room_id as string))]
  const remove = stale.filter((id) => !keep.includes(id))
  if (remove.length) {
    const { error: deleteError } = await db.from('rooms').delete().in('id', remove)
    if (deleteError) {
      report.failures++
      console.error(`  ! ${liteapiId}: removing old room types failed: ${deleteError.message}`)
    }
  }
  if (keep.length) {
    const cheapest = Math.min(...rooms.map((room) => room.price_per_night))
    const { error: updateError } = await db.from('rooms').update({ price_per_night: cheapest }).in('id', keep)
    if (updateError) {
      report.failures++
      console.error(`  ! ${liteapiId}: repricing booked old room types failed: ${updateError.message}`)
    }
  }
  console.log(`  ${liteapiId}: removed ${remove.length} old room type(s)${keep.length ? `, repriced ${keep.length} with bookings` : ''}`)
}

async function existingHotels(db: SupabaseClient): Promise<Existing> {
  const existing: Existing = new Map()
  // Moves on by the rows each page returned and stops at an empty one, so a lower max-rows setting can't skip any
  for (let from = 0; ;) {
    const { data, error } = await db.from('hotels').select('liteapi_id, liteapi_deleted_at').not('liteapi_id', 'is', null)
      .order('liteapi_id').range(from, from + DB_PAGE - 1)
    if (error) throw new CliError(`Reading imported hotels failed: ${error.message}. Has supabase/migrations/liteapi_hotels.sql been run?`)
    if (!data?.length) return existing
    for (const row of data) existing.set(row.liteapi_id, row.liteapi_deleted_at)
    from += data.length
  }
}

function printSummary(options: Options, report: Report, run: Run) {
  const roomCount = report.imported.reduce((sum, item) => sum + item.rooms.length, 0)
  if (options.since === null) {
    console.log(`\nSummary: ${report.imported.length} hotels, ${roomCount} room types mapped, ${requestCount} LiteAPI requests`)
  } else {
    const added = report.imported.filter((item) => !run.existing?.has(item.hotel.liteapi_id)).length
    const skipped = [...report.skipped.values()].reduce((sum, n) => sum + n, 0)
    console.log(`\nSummary${options.dryRun ? ' (dry run, nothing written)' : ''}: ${report.imported.length - added} updated, ${added} added, ` +
      `${report.removed.length} marked removed, ${skipped} skipped; ${roomCount} room types mapped, ${requestCount} LiteAPI requests`)
  }
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  let db: SupabaseClient | null = null
  if (!options.dryRun && sqlOut === null) {
    if (!secret) throw new CliError('SUPABASE_SECRET_KEY is not set, so nothing can be written. Add it to .env.local, or use --dry-run or --sql-out.')
    if (!url) throw new CliError('NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local.')
    db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  } else if (options.since !== null && url && secret) {
    // Only read from: a dry run writes nothing
    db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  }

  const run: Run = { at: new Date().toISOString(), existing: null }
  const report: Report = { imported: [], removed: [], skipped: new Map(), failures: 0, droppedRooms: 0, unmapped: new Map(), checked: [] }
  const seen = new Set<string>()
  if (options.since === null) {
    for (const cityKey of options.cities) await importCity(apiKey, cityKey, options, seen, report, run)
  } else {
    if (db) run.existing = await existingHotels(db)
    else {
      console.log('No Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY), so every listed hotel counts as new' +
        `${options.since === 'auto' ? ` and --since auto means the last ${AUTO_MAX_DAYS} days` : ''}.`)
    }
    for (const cityKey of options.cities) await syncCity(apiKey, db, cityKey, options, seen, report, run)
    await refreshSaved(apiKey, db, options, seen, report, run)
  }

  if (options.dryRun) {
    console.log('\nFirst mapped rows (dry run, nothing written):')
    for (const item of report.imported.slice(0, 2)) console.log(JSON.stringify(item, null, 2))
  } else if (sqlOut !== null) {
    const header = `-- LiteAPI import for ${options.cities.join(', ')}, generated ${new Date().toISOString()}.\n` +
      '-- Run supabase/migrations/liteapi_hotels.sql first. Safe to re-run: rows are updated in place, and room types this run\n' +
      '-- left out are removed unless a reservation points at them.\n' +
      '-- Do not paste it over newer data (a later import or sync): its hotels would go back to this copy, and any LiteAPI\n' +
      '-- removed since would show in search again.\n'
    const sql = `${header}begin;\n\n${report.imported.map((item) => hotelSql(item.hotel, item.rooms)).join('\n')}\ncommit;\n`
    fs.mkdirSync(path.dirname(sqlOut), { recursive: true })
    fs.writeFileSync(sqlOut, sql)
    console.log(`\nWrote ${report.imported.length} hotels to ${sqlOut}`)
  } else if (db) {
    await writeToSupabase(db, report.imported, report, run.at)
  }

  printSummary(options, report, run)
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
