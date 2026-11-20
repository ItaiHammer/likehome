// Tests for utils/rewards.ts — run with `npm test`
// Supabase is mocked; lib/rewards.ts is the real code.
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
  for (const step of ['select', 'eq', 'gt', 'lt', 'order', 'range']) {
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

const { getRewardsHistory } = await import('../utils/rewards.ts')

beforeEach(() => {
  calls = []
  result = { data: [], error: null, count: 0 }
})

const step = (name) => calls.find((c) => c[0] === name)

test('history reads the signed-in account’s ledger, newest first, 10 per page', async () => {
  await getRewardsHistory('acct-1', { page: 3 })
  assert.deepEqual(step('from'), ['from', 'points_transactions'])
  assert.deepEqual(step('eq'), ['eq', 'account_id', 'acct-1'])
  assert.deepEqual(step('order'), ['order', 'created_at', { ascending: false }])
  assert.deepEqual(step('range'), ['range', 20, 29])
  assert.equal(step('gt'), undefined)
  assert.equal(step('lt'), undefined)
})

test('earned keeps positive rows and redeemed keeps negative rows', async () => {
  await getRewardsHistory('acct-1', { filter: 'earned' })
  assert.deepEqual(step('gt'), ['gt', 'points', 0])
  calls = []
  await getRewardsHistory('acct-1', { filter: 'redeemed' })
  assert.deepEqual(step('lt'), ['lt', 'points', 0])
})

test('rows carry the hotel name through the booking, or null when the booking is gone', async () => {
  result = {
    data: [
      { id: 'a', type: 'earn', points: 1240, created_at: '2026-09-18T15:00:00Z', reservations: { hotels: { name: 'Casa Maré' } } },
      { id: 'b', type: 'refund', points: '500', created_at: '2026-08-04T15:00:00Z', reservations: null },
    ],
    error: null,
    count: 12,
  }
  const { data, total, error } = await getRewardsHistory('acct-1')
  assert.equal(error, null)
  assert.equal(total, 12)
  assert.deepEqual(data, [
    { id: 'a', type: 'earn', points: 1240, createdAt: '2026-09-18T15:00:00Z', hotelName: 'Casa Maré' },
    { id: 'b', type: 'refund', points: 500, createdAt: '2026-08-04T15:00:00Z', hotelName: null },
  ])
})

test('a page past the last one is empty, not an error', async () => {
  result = { data: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable' }, count: null }
  assert.deepEqual(await getRewardsHistory('acct-1', { page: 99 }), { data: [], total: 0, error: null })
})

test('other read errors are passed back to the page', async () => {
  const failure = { code: '42501', message: 'permission denied' }
  result = { data: null, error: failure, count: null }
  const { data, error } = await getRewardsHistory('acct-1')
  assert.deepEqual(data, [])
  assert.equal(error, failure)
})
