// Tests for utils/comparison.ts — run with `npm test`
// Supabase is mocked; lib/comparison.ts is the real code.
import { register } from 'node:module'
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Node can't resolve Next's `@/` alias or extensionless `next/headers`, so map them here.
const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      if (s === 'next/headers') return next('next/headers.js', c)
      return next(s, c)
    }`)
)

let calls
let result

// Records each query step; awaiting it resolves to `result`, like a supabase-js query
function query() {
  const q = {}
  for (const step of ['select', 'eq', 'in', 'order']) {
    q[step] = (...args) => {
      calls.push([step, ...args])
      return q
    }
  }
  q.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  return q
}

mock.module('next/headers', { namedExports: { cookies: async () => ({}) } })
mock.module('@/utils/supabase/server', {
  namedExports: {
    createClient: () => ({
      from: (table) => {
        calls.push(['from', table])
        return query()
      },
    }),
  },
})

const { getComparisonListings, getRecentlyViewedListings } = await import('../utils/comparison.ts')

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const hotel = (id, more = {}) => ({
  id,
  name: `Hotel ${id.slice(0, 1)}`,
  city: 'Monterey',
  region: 'California',
  country: 'US',
  photo_urls: ['a.jpg'],
  rating: 4.5,
  tags: ['Pool'],
  liteapi_deleted_at: null,
  rooms: [{ price_per_night: 150, capacity: 3, tags: ['Kitchen'] }],
  ...more,
})

beforeEach(() => {
  calls = []
  result = { data: [], error: null }
})

test('recently viewed: reads only this account’s history, newest first, with each hotel’s rooms', async () => {
  await getRecentlyViewedListings('account-1')
  assert.deepEqual(calls[0], ['from', 'recently_viewed_hotels'])
  const [, fields] = calls.find(([step]) => step === 'select')
  assert.match(fields, /^viewed_at, hotels\(.*rooms\(price_per_night, capacity, tags\)\)$/)
  assert.deepEqual(calls.find(([step]) => step === 'eq'), ['eq', 'account_id', 'account-1'])
  assert.deepEqual(calls.find(([step]) => step === 'order'), ['order', 'viewed_at', { ascending: false }])
})

test('recently viewed: keeps the database order and each view time, without the current hotel', async () => {
  result = {
    data: [
      { viewed_at: '2026-10-22T18:30:00Z', hotels: hotel(C) },
      { viewed_at: '2026-10-22T18:20:00Z', hotels: hotel(A) },
      { viewed_at: '2026-10-22T18:10:00Z', hotels: hotel(B) },
    ],
    error: null,
  }
  const { data, error } = await getRecentlyViewedListings('account-1', A)
  assert.equal(error, null)
  assert.deepEqual(data.map((l) => [l.id, l.viewedAt]), [[C, '2026-10-22T18:30:00Z'], [B, '2026-10-22T18:10:00Z']])
  assert.equal(data[0].priceFrom, 150)
})

test('recently viewed: drops deleted, delisted and roomless hotels', async () => {
  result = {
    data: [
      { viewed_at: '2026-10-22T18:40:00Z', hotels: null },
      { viewed_at: '2026-10-22T18:30:00Z', hotels: hotel(A, { liteapi_deleted_at: '2026-10-20T00:00:00Z' }) },
      { viewed_at: '2026-10-22T18:20:00Z', hotels: hotel(B, { rooms: [] }) },
      { viewed_at: '2026-10-22T18:10:00Z', hotels: hotel(C) },
    ],
    error: null,
  }
  const { data } = await getRecentlyViewedListings('account-1')
  assert.deepEqual(data.map((l) => l.id), [C])
})

test('recently viewed: a non-hotel current id (a sample stay) is just ignored', async () => {
  result = { data: [{ viewed_at: '2026-10-22T18:10:00Z', hotels: hotel(A) }], error: null }
  const { data } = await getRecentlyViewedListings('account-1', 'fairmont-banff')
  assert.deepEqual(data.map((l) => l.id), [A])
})

test('recently viewed: a database error comes back with an empty list', async () => {
  const failure = { code: '42501', message: 'permission denied' }
  result = { data: null, error: failure }
  assert.deepEqual(await getRecentlyViewedListings('account-1'), { data: [], error: failure })
})

test('compare: asks for the cleaned ids and returns them in that order', async () => {
  result = { data: [hotel(A), hotel(C)], error: null }
  const { data, error } = await getComparisonListings([C, 'junk', A, A.toUpperCase(), B])
  assert.equal(error, null)
  assert.deepEqual(calls[0], ['from', 'hotels'])
  assert.deepEqual(calls.find(([step]) => step === 'in'), ['in', 'id', [C, A, B]])
  assert.deepEqual(data.map((l) => l.id), [C, A])
  assert.ok(data.every((l) => l.viewedAt === null))
})

test('compare: no valid ids means no database call', async () => {
  assert.deepEqual(await getComparisonListings([]), { data: [], error: null })
  assert.deepEqual(await getComparisonListings(['fairmont-banff', '', 'junk']), { data: [], error: null })
  assert.equal(calls.length, 0)
})

test('compare: a database error comes back with an empty list', async () => {
  const failure = { code: '500', message: 'boom' }
  result = { data: null, error: failure }
  assert.deepEqual(await getComparisonListings([A]), { data: [], error: failure })
})
