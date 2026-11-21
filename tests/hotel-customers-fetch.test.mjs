// Tests for utils/hotel-customers.ts — run with `npm test`
// The auth and data helpers are mocked; lib/hotel-customers.ts is the real code.
import { register } from 'node:module'
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Node can't resolve Next's `@/` alias, so map it here.
const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      return next(s, c)
    }`)
)

const HOTEL = '11111111-1111-4111-8111-111111111111'

const row = (more = {}) => ({
  reservation_id: '3f2a9c1e-0b7d-4e5f-8a6b-1c2d3e4f5a6b',
  hotel_id: HOTEL,
  hotel_name: 'Harbor House',
  room_id: 'room-1',
  room_type: 'Double',
  guest_id: 'guest-1',
  guest_name: 'Ana Ruiz',
  guest_email: 'ana@example.com',
  check_in: '2026-12-01',
  check_out: '2026-12-04',
  nights: 3,
  guests: 2,
  children: 0,
  status: 'confirmed',
  stage: 'upcoming',
  total_price: 420,
  has_insurance: false,
  cancelled_at: null,
  cancellation_fee: null,
  amount_paid: 420,
  amount_refunded: 0,
  booked_at: '2026-10-20T18:00:00+00:00',
  ...more,
})

const CUSTOMER = {
  guest_id: 'guest-1',
  guest_name: 'Ana Ruiz',
  guest_email: 'ana@example.com',
  total_bookings: 1,
  cancelled_bookings: 0,
  upcoming_bookings: 1,
  nights_stayed: 0,
  total_paid: 420,
  first_stay: null,
  last_stay: null,
  next_stay: '2026-12-01',
  is_repeat: false,
  hotel_names: ['Harbor House'],
}
const NOT_OWNED = { data: [], error: { code: '42501', message: 'You do not own this listing' } }

let userId
let historyResult
let customersResult
let hotelsResult
let today
const getHotelBookingHistory = mock.fn(async () => historyResult)
const getHotelCustomerHistory = mock.fn(async () => customersResult)
const getHotelsByOwner = mock.fn(async () => hotelsResult)
const consoleError = mock.method(console, 'error', () => {})

mock.module('@/utils/user', { namedExports: { getUserId: async () => ({ supabase: {}, userId }) } })
mock.module('@/utils/history', { namedExports: { getHotelBookingHistory, getHotelCustomerHistory } })
mock.module('@/utils/hotels', { namedExports: { getHotelsByOwner } })
mock.module('@/utils/guest-today', { namedExports: { guestToday: async () => today } })

const { getHotelCustomers } = await import('../utils/hotel-customers.ts')

beforeEach(() => {
  userId = 'owner-1'
  historyResult = { data: [row()], error: null }
  customersResult = { data: [CUSTOMER], error: null }
  hotelsResult = { data: [{ id: HOTEL, name: 'Harbor House', owner_id: 'owner-1' }], error: null }
  today = '2026-11-05'
  getHotelBookingHistory.mock.resetCalls()
  getHotelCustomerHistory.mock.resetCalls()
  getHotelsByOwner.mock.resetCalls()
  consoleError.mock.resetCalls()
})

const rpcCalls = () => [getHotelBookingHistory, getHotelCustomerHistory].map((fn) => fn.mock.calls.map((c) => c.arguments))

test('signed out: nothing is fetched', async () => {
  userId = null
  assert.deepEqual(await getHotelCustomers(), { ok: false, reason: 'signed-out' })
  assert.deepEqual(rpcCalls(), [[], []])
})

test('a listing id that is not a UUID is refused before the database', async () => {
  assert.deepEqual(await getHotelCustomers('nope'), { ok: false, reason: 'invalid-listing' })
  assert.deepEqual(await getHotelCustomers(''), { ok: false, reason: 'invalid-listing' })
  assert.deepEqual(rpcCalls(), [[], []])
})

test('no id asks both RPCs for every listing; an id asks for that one', async () => {
  await getHotelCustomers()
  await getHotelCustomers(HOTEL)
  const calls = [[undefined, '2026-11-05'], [HOTEL, '2026-11-05']]
  assert.deepEqual(rpcCalls(), [calls, calls])
  assert.deepEqual(getHotelsByOwner.mock.calls[0].arguments, ['owner-1'])
})

test('a listing the owner does not own is not-owner, from either RPC', async () => {
  historyResult = NOT_OWNED
  customersResult = NOT_OWNED
  assert.deepEqual(await getHotelCustomers(HOTEL), { ok: false, reason: 'not-owner' })
  historyResult = { data: [row()], error: null }
  assert.deepEqual(await getHotelCustomers(HOTEL), { ok: false, reason: 'not-owner' })
  assert.equal(consoleError.mock.callCount(), 0)
})

test('any other database error is failed and logged', async () => {
  historyResult = { data: [], error: { code: '57014', message: 'timeout' } }
  assert.deepEqual(await getHotelCustomers(), { ok: false, reason: 'failed' })
  historyResult = { data: [row()], error: null }
  customersResult = { data: [], error: { code: '57014', message: 'timeout' } }
  assert.deepEqual(await getHotelCustomers(), { ok: false, reason: 'failed' })
  customersResult = { data: [CUSTOMER], error: null }
  hotelsResult = { data: null, error: { code: 'PGRST000', message: 'down' } }
  assert.deepEqual(await getHotelCustomers(), { ok: false, reason: 'failed' })
  assert.equal(consoleError.mock.callCount(), 3)
})

test('both RPCs get the viewer’s today, so the database can decide each stage', async () => {
  today = '2026-12-02'
  await getHotelCustomers()
  assert.deepEqual(rpcCalls(), [[[undefined, '2026-12-02']], [[undefined, '2026-12-02']]])
})

test('the history is built from both RPCs and the listings', async () => {
  const result = await getHotelCustomers()
  assert.equal(result.ok, true)
  assert.equal(result.data.bookings[0].stage, 'upcoming')
  assert.deepEqual(result.data.listings, [{ id: HOTEL, name: 'Harbor House' }])
  assert.equal(result.data.customers[0].name, 'Ana Ruiz')
  assert.equal(result.data.customers[0].nextStay, '2026-12-01')
  assert.equal(result.data.summary.revenue, 420)
})
