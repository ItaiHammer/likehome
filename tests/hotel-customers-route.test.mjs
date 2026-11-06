// Tests for GET /api/listings/customers — run with `npm test`
// The auth and data helpers are mocked; utils/hotel-customers and lib/hotel-customers are the real code.
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

const ROW = {
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
  total_price: '420.00',
  has_insurance: false,
  cancelled_at: null,
  cancellation_fee: null,
  amount_paid: '420.00',
  amount_refunded: 0,
  booked_at: '2026-10-20T18:00:00+00:00',
}

let userId
let historyResult
const getHotelBookingHistory = mock.fn(async () => historyResult)
mock.method(console, 'error', () => {})

mock.module('@/utils/user', { namedExports: { getUserId: async () => ({ supabase: {}, userId }) } })
mock.module('@/utils/history', { namedExports: { getHotelBookingHistory } })
mock.module('@/utils/hotels', {
  namedExports: { getHotelsByOwner: async () => ({ data: [{ id: HOTEL, name: 'Harbor House' }], error: null }) },
})
mock.module('@/utils/guest-today', { namedExports: { guestToday: async () => '2026-11-05' } })

const { GET } = await import('../app/api/listings/customers/route.ts')

const get = (query = '') => GET(new Request(`http://localhost/api/listings/customers${query}`))

beforeEach(() => {
  userId = 'owner-1'
  historyResult = { data: [ROW], error: null }
  getHotelBookingHistory.mock.resetCalls()
})

async function assertError(res, status) {
  assert.equal(res.status, status)
  assert.equal(res.headers.get('cache-control'), 'no-store')
  const body = await res.json()
  assert.equal(typeof body.error, 'string')
  assert.deepEqual(Object.keys(body), ['error'])
}

test('signed out is 401', async () => {
  userId = null
  await assertError(await get(), 401)
})

test('a malformed listing id is 400', async () => {
  await assertError(await get('?hotel=nope'), 400)
  await assertError(await get('?hotel='), 400)
})

test('someone else’s listing (or one that doesn’t exist) is 403', async () => {
  historyResult = { data: [], error: { code: '42501', message: 'You do not own this listing' } }
  await assertError(await get(`?hotel=${HOTEL}`), 403)
})

test('a database failure is 500 without the error details', async () => {
  historyResult = { data: [], error: { code: '57014', message: 'canceling statement due to statement timeout' } }
  const res = await get()
  await assertError(res.clone(), 500)
  assert.doesNotMatch(await res.text(), /timeout/)
})

test('?hotel= picks one listing; no query means every listing', async () => {
  await get()
  await get(`?hotel=${HOTEL}`)
  assert.deepEqual(getHotelBookingHistory.mock.calls.map((c) => c.arguments[0]), [undefined, HOTEL])
})

test('200 returns listings, summary, customers and bookings, never cached', async () => {
  const res = await get()
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'no-store')
  const body = await res.json()
  assert.deepEqual(Object.keys(body), ['listings', 'summary', 'customers', 'bookings'])
  assert.deepEqual(body.listings, [{ id: HOTEL, name: 'Harbor House' }])
  assert.deepEqual(body.summary, { customers: 1, repeatCustomers: 0, bookings: 1, upcoming: 1, cancelled: 0, revenue: 420 })
  assert.equal(body.customers[0].email, 'ana@example.com')
  assert.equal(body.bookings[0].code, 'LH-3F2A9C1E')
  assert.equal(body.bookings[0].totalPrice, 420)
})
