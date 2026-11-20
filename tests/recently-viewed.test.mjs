// Tests for utils/recently-viewed.ts. Run with `npm test`. Supabase is mocked.
import { register } from 'node:module'
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

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

function query() {
  const q = {}
  for (const step of ['select', 'eq', 'order']) {
    q[step] = (...args) => {
      calls.push([step, ...args])
      return q
    }
  }
  q.then = (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
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

const { getRecentlyViewedLocationAndPrice } = await import('../utils/recently-viewed.ts')

beforeEach(() => {
  calls = []
})

test('recommendation summary: reads liteapi_deleted_at, so a delisted hotel can’t pick the city', async () => {
  await getRecentlyViewedLocationAndPrice('account-1')
  assert.deepEqual(calls[0], ['from', 'recently_viewed_hotels'])
  const [, fields] = calls.find(([step]) => step === 'select')
  assert.match(fields, /hotels\([^)]*\bliteapi_deleted_at\b/)
  assert.deepEqual(calls.find(([step]) => step === 'eq'), ['eq', 'account_id', 'account-1'])
  assert.deepEqual(calls.find(([step]) => step === 'order'), ['order', 'viewed_at', { ascending: false }])
})
