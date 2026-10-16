// Tests for the search_hotels arguments utils/search.ts sends — run with `npm test`
// The Supabase client is mocked; search-backend.test.mjs mocks this module, so it can't see these.
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

const rpc = mock.fn(async () => ({ data: [{ total_count: 1 }], error: null }))
mock.module('next/headers', { namedExports: { cookies: async () => ({}) } })
mock.module('@/utils/supabase/server', { namedExports: { createClient: () => ({ rpc }) } })

const { searchAvailableHotels } = await import('../utils/search.ts')

const argsOfCall = () => {
  const [name, args] = rpc.mock.calls[0].arguments
  assert.equal(name, 'search_hotels')
  return args
}

beforeEach(() => rpc.mock.resetCalls())

// The names must match search_hotels.sql: PostgREST picks the function by its argument names
test('every search_hotels argument is sent, as null when not given', async () => {
  await searchAvailableHotels({})
  assert.deepEqual(argsOfCall(), {
    p_query: null, p_city: null, p_region: null, p_country: null, p_check_in: null, p_check_out: null,
    p_guests: null, p_adults: null, p_children: null, p_min_price: null, p_max_price: null, p_min_rating: null,
    p_num_beds: null, p_bed_size: null, p_tags: null, p_sort: 'recommended', p_limit: 21, p_offset: 0,
  })
})

test('adults and children reach search_hotels as p_adults and p_children', async () => {
  await searchAvailableHotels({ guests: 4, adults: 2, children: 2 })
  const args = argsOfCall()
  assert.deepEqual([args.p_guests, args.p_adults, args.p_children], [4, 2, 2])

  rpc.mock.resetCalls()
  await searchAvailableHotels({ guests: 2, adults: 2, children: 0 })
  assert.equal(argsOfCall().p_children, 0, 'no children is a real 0, not null')
})

test('LiteAPI ids are sent only when there are some', async () => {
  await searchAvailableHotels({ liteapi_ids: ['lp1', 'lp2'] })
  assert.deepEqual(argsOfCall().p_liteapi_ids, ['lp1', 'lp2'])

  rpc.mock.resetCalls()
  await searchAvailableHotels({ liteapi_ids: [] })
  assert.equal('p_liteapi_ids' in argsOfCall(), false)
})
