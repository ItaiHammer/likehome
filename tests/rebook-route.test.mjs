// Tests for POST /api/reservations/[id]/rebook — run with `npm test`
// The auth and CRUD helpers are mocked; reservation-logic, bookings and rebook are the real code.
import { register } from 'node:module'
import { test, mock, beforeEach, describe } from 'node:test'
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

const PAST = {
  id: 'res-old',
  account_id: 'user-1',
  hotel_id: 'hotel-1',
  room_id: 'room-double',
  check_in: '2026-01-10',
  check_out: '2026-01-13',
  guests: 2,
  total_price: 420,
  status: 'completed',
}
const HOTEL = { id: 'hotel-1', name: 'Casa del Sol' }
const ROOMS = [
  { id: 'room-suite', room_type: 'Suite', price_per_night: '250.00', capacity: 4 },
  { id: 'room-double', room_type: 'Double', price_per_night: '140.00', capacity: 2 },
  { id: 'room-single', room_type: 'Single', price_per_night: '90.00', capacity: 1 },
]

let userId
let reservationResult
let hotelResult
let roomsResult
// Rebooking must never write: these stay at zero for the whole file
const createReservation = mock.fn()
const updateReservation = mock.fn()
const consoleError = mock.method(console, 'error', () => {})

mock.module('@/utils/user', { namedExports: { getUserId: async () => ({ supabase: {}, userId }) } })
mock.module('@/utils/reservations', {
  namedExports: { getReservation: async () => reservationResult, createReservation, updateReservation },
})
mock.module('@/utils/hotels', { namedExports: { getHotel: async () => hotelResult } })
mock.module('@/utils/rooms', { namedExports: { getRoomsByHotel: async () => roomsResult } })

const { POST } = await import('../app/api/reservations/[id]/rebook/route.ts')

function future(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const validBody = () => ({ check_in: future(10), check_out: future(13) })

async function post(body, id = PAST.id) {
  const res = await POST(
    new Request(`http://localhost/api/reservations/${id}/rebook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
  return { status: res.status, json: await res.json() }
}

beforeEach(() => {
  userId = 'user-1'
  reservationResult = { data: { ...PAST }, error: null }
  hotelResult = { data: { ...HOTEL }, error: null }
  roomsResult = { data: ROOMS.map((r) => ({ ...r })), error: null }
  consoleError.mock.resetCalls()
})

describe('auth and the past booking', () => {
  test('401 when signed out', async () => {
    userId = null
    assert.equal((await post(validBody())).status, 401)
  })

  test('404 when the booking does not exist or the id is not a uuid', async () => {
    for (const code of ['PGRST116', '22P02']) {
      reservationResult = { data: null, error: { code, message: 'nope' } }
      const r = await post(validBody())
      assert.equal(r.status, 404, code)
      assert.equal(r.json.error, 'Booking not found.')
    }
  })

  test('404 for another guest’s booking', async () => {
    reservationResult = { data: { ...PAST, account_id: 'user-2' }, error: null }
    assert.equal((await post(validBody())).status, 404)
  })

  test('500 when the booking lookup fails for another reason', async () => {
    reservationResult = { data: null, error: { code: '08006', message: 'connection lost' } }
    assert.equal((await post(validBody())).status, 500)
    assert.equal(consoleError.mock.callCount(), 1)
  })
})

describe('new dates', () => {
  test('400 on invalid JSON', async () => {
    const r = await post('{not json')
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'Invalid JSON body.')
  })

  test('400 for each invalid stay, before the hotel is looked up', async () => {
    const cases = [
      {},
      { check_in: future(10) },
      { check_in: '2020-01-01', check_out: '2020-01-03' },
      { check_in: future(10), check_out: future(10) },
      { check_in: future(13), check_out: future(10) },
      { check_in: future(10), check_out: future(50) },
      { check_in: 'tomorrow', check_out: future(13) },
    ]
    for (const body of cases) {
      assert.equal((await post(body)).status, 400, JSON.stringify(body))
    }
    for (const body of ['null', '"hi"', '42', '[]']) {
      assert.equal((await post(body)).status, 400, body)
    }
  })
})

describe('hotel and room', () => {
  test('404 when the hotel is gone', async () => {
    hotelResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    const r = await post(validBody())
    assert.equal(r.status, 404)
    assert.equal(r.json.error, 'This hotel is no longer listed.')
  })

  test('500 when the hotel or rooms lookup fails', async () => {
    roomsResult = { data: null, error: { code: '08006', message: 'connection lost' } }
    assert.equal((await post(validBody())).status, 500)

    roomsResult = { data: ROOMS, error: null }
    hotelResult = { data: null, error: { code: '08006', message: 'connection lost' } }
    assert.equal((await post(validBody())).status, 500)
  })

  test('404 when that room type isn’t listed anymore, even if other rooms are', async () => {
    for (const data of [ROOMS.filter((r) => r.id !== 'room-double'), []]) {
      roomsResult = { data, error: null }
      const r = await post(validBody())
      assert.equal(r.status, 404)
      assert.equal(r.json.error, 'This hotel room isn’t listed anymore.')
    }
  })

  test('400 when the room no longer fits the guests', async () => {
    reservationResult = { data: { ...PAST, guests: 3 }, error: null }
    const r = await post(validBody())
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'This room fits up to 2 guests.')
  })

})

describe('the rebook', () => {
  test('200 with the same room, current price and the pre-filled checkout link', async () => {
    const r = await post(validBody())
    assert.equal(r.status, 200)
    assert.deepEqual(r.json.rebook, {
      hotel_id: 'hotel-1',
      hotel_name: 'Casa del Sol',
      room_id: 'room-double',
      room_name: 'Double',
      check_in: future(10),
      check_out: future(13),
      nights: 3,
      guests: 2,
      total_price: 420,
      checkout_url: `/reserve/hotel-1?room=room-double&checkIn=${future(10)}&checkOut=${future(13)}&adults=2&children=0`,
    })
  })

  test('a booking with no saved guest count rebooks for 1 guest', async () => {
    reservationResult = { data: { ...PAST, guests: null }, error: null }
    const r = await post(validBody())
    assert.equal(r.status, 200)
    assert.equal(r.json.rebook.guests, 1)
    assert.match(r.json.rebook.checkout_url, /adults=1&/)
  })

  test('never creates or changes a reservation', () => {
    assert.equal(createReservation.mock.callCount() + updateReservation.mock.callCount(), 0)
  })
})
