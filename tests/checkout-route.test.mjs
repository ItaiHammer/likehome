// Tests for POST /api/checkout — run with `npm test`
// Supabase and the CRUD helpers are mocked; reservation-logic and payment-logic are the real code.
import { register } from 'node:module'
import { test, mock, beforeEach, describe } from 'node:test'
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

const ROOM = { id: 'room-1', hotel_id: 'hotel-1', price_per_night: 129.99, capacity: 2 }
const FULL_CARD = '4242424242424242'
const CVC = '987'

let claims
let roomResult
const createReservation = mock.fn()
const updateReservation = mock.fn()
const createPayment = mock.fn()
const recordCheckoutCharge = mock.fn()
const consoleError = mock.method(console, 'error', () => {})

mock.module('next/headers', { namedExports: { cookies: async () => ({}) } })
mock.module('@/utils/supabase/server', {
  namedExports: {
    createClient: () => ({
      auth: { getClaims: async () => claims },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => roomResult }) }) }),
    }),
  },
})
mock.module('@/utils/reservations', { namedExports: { createReservation, updateReservation } })
mock.module('@/utils/payments', { namedExports: { createPayment } })
mock.module('@/utils/transactions', { namedExports: { recordCheckoutCharge } })
const liveRoomPrice = mock.fn(async () => ({ status: 'unavailable' }))
mock.module('@/lib/liteapi/rates', { namedExports: { liveRoomPrice } })

const { POST } = await import('../app/api/checkout/route.ts')

function future(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const validBody = () => ({
  room_id: 'room-1',
  check_in: future(10),
  check_out: future(13),
  guests: 2,
  children: 0,
  payment: {
    card_number: '4242 4242 4242 4242',
    exp_month: 12,
    exp_year: 2030,
    cvc: CVC,
    name_on_card: 'Alex Rivera',
  },
})

const withCard = (card_number, extra = {}) => {
  const body = validBody()
  body.payment = { ...body.payment, card_number, ...extra }
  return body
}

async function post(body) {
  const res = await POST(
    new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  )
  return { status: res.status, json: await res.json() }
}

const writes = () =>
  createReservation.mock.callCount() +
  updateReservation.mock.callCount() +
  createPayment.mock.callCount() +
  recordCheckoutCharge.mock.callCount()

beforeEach(() => {
  claims = { data: { claims: { sub: 'user-1' } }, error: null }
  roomResult = { data: { ...ROOM }, error: null }
  for (const fn of [createReservation, updateReservation, createPayment, recordCheckoutCharge, consoleError, liveRoomPrice]) {
    fn.mock.resetCalls()
  }
  liveRoomPrice.mock.mockImplementation(async () => ({ status: 'unavailable' }))
  createReservation.mock.mockImplementation(async (r) => ({
    data: [{ id: 'res-1', status: 'confirmed', ...r }],
    error: null,
  }))
  updateReservation.mock.mockImplementation(async () => ({ data: [{ id: 'res-1' }], error: null }))
  createPayment.mock.mockImplementation(async (p) => ({ data: [{ id: 'pay-1', ...p }], error: null }))
  // The database function prices the charge itself (audit F13); the mock mirrors the room price
  recordCheckoutCharge.mock.mockImplementation(async (paymentId) => ({
    data: [{ id: 'txn-1', payment_id: paymentId, amount: 389.97, transaction_type: 'charge', status: 'completed' }],
    error: null,
  }))
})

describe('auth', () => {
  test('401 when signed out, nothing written', async () => {
    claims = { data: { claims: {} }, error: null }
    const r = await post(validBody())
    assert.equal(r.status, 401)
    assert.equal(writes(), 0)
  })

  test('401 when the session check errors', async () => {
    claims = { data: null, error: new Error('bad jwt') }
    assert.equal((await post(validBody())).status, 401)
  })
})

describe('request body', () => {
  test('400 on invalid JSON', async () => {
    const r = await post('{not json')
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'Invalid JSON body.')
  })

  test('400 on JSON that is not an object', async () => {
    for (const body of ['null', '"hi"', '42', '[]']) {
      assert.equal((await post(body)).status, 400, body)
    }
  })

  test('400 for each invalid stay, before the room is looked up', async () => {
    const cases = [
      { room_id: '' },
      { check_in: '2020-01-01', check_out: '2020-01-03' },
      { check_out: future(10) },
      { check_out: future(50) },
      { check_in: 'tomorrow' },
      { guests: 0 },
      { guests: '2' },
      { children: -1 },
      { children: 1.5 },
      { children: '1' },
      // every booking needs an adult
      { guests: 2, children: 2 },
    ]
    for (const patch of cases) {
      const r = await post({ ...validBody(), ...patch })
      assert.equal(r.status, 400, JSON.stringify(patch))
    }
    assert.equal(writes(), 0)
  })

  test('stay errors are reported before card errors', async () => {
    const r = await post({ ...withCard('1234'), room_id: '' })
    assert.equal(r.json.error, 'room_id is required.')
  })

  test('400 when payment details are missing or not an object', async () => {
    for (const payment of [undefined, null, 'card', 4242]) {
      const r = await post({ ...validBody(), payment })
      assert.equal(r.status, 400)
      assert.equal(r.json.error, 'Payment details are required.')
    }
  })

  test('400 for each invalid card, nothing written', async () => {
    const cases = [
      [withCard('4242 4242 4242 4241'), 'Enter a valid card number.'],
      [withCard('3056 9300 0902 0004'), 'We accept Visa, Mastercard, American Express and Discover.'],
      [withCard(FULL_CARD, { exp_month: 1, exp_year: 2020 }), 'This card has expired.'],
      [withCard(FULL_CARD, { exp_month: 13 }), 'Enter a valid expiry date.'],
      [withCard(FULL_CARD, { cvc: '12' }), 'Enter the 3 digit security code.'],
      [withCard('378282246310005', { cvc: '123' }), 'Enter the 4 digit security code.'],
      [withCard(FULL_CARD, { name_on_card: '' }), 'Enter the name on your card.'],
    ]
    for (const [body, error] of cases) {
      const r = await post(body)
      assert.equal(r.status, 400)
      assert.equal(r.json.error, error)
    }
    assert.equal(writes(), 0)
  })
})

describe('room', () => {
  test('404 when the room lookup errors or finds nothing', async () => {
    roomResult = { data: null, error: { code: 'PGRST116' } }
    assert.equal((await post(validBody())).status, 404)
    roomResult = { data: null, error: null }
    assert.equal((await post(validBody())).status, 404)
    assert.equal(writes(), 0)
  })

  test('400 when guests exceed room capacity', async () => {
    const r = await post({ ...validBody(), guests: 3 })
    assert.equal(r.status, 400)
    assert.match(r.json.error, /fits up to 2/)
    assert.equal(writes(), 0)
  })
})

describe('pricing', () => {
  test('price comes from the database, never the request', async () => {
    const r = await post({ ...validBody(), total_price: 1, price_per_night: 1 })
    assert.equal(r.status, 201)
    assert.equal(createReservation.mock.calls[0].arguments[0].total_price, 389.97)
    // The charge is priced by the database, so the route only passes the payment id
    assert.deepEqual(recordCheckoutCharge.mock.calls[0].arguments, ['pay-1'])
    assert.equal(r.json.transaction.amount, 389.97)
    assert.equal(liveRoomPrice.mock.callCount(), 0)
  })

  test('handles a numeric-string price from Postgres', async () => {
    roomResult = { data: { ...ROOM, price_per_night: '100.00' }, error: null }
    const r = await post(validBody())
    assert.equal(r.json.reservation.total_price, 300)
  })

  test('402 and nothing written when the room price is zero or missing', async () => {
    for (const price_per_night of [0, null]) {
      roomResult = { data: { ...ROOM, price_per_night }, error: null }
      const r = await post(validBody())
      assert.equal(r.status, 402)
      assert.equal(r.json.error, 'Invalid payment amount.')
    }
    assert.equal(writes(), 0)
  })
})

describe('LiteAPI hotels', () => {
  const LITE_ROOM = {
    ...ROOM,
    room_type: 'Standard King Room',
    liteapi_room_id: '2617267',
    hotels: { liteapi_id: 'lp1897' },
  }
  const live = (total, nights) => ({
    status: 'live',
    value: { total, perNight: total / nights, offerId: 'offer-1', rateName: 'Standard King Room', boardType: 'RO', refundable: true, dueAtProperty: 0 },
  })

  beforeEach(() => {
    roomResult = { data: { ...LITE_ROOM }, error: null }
  })

  test('priced live: the quote total is stored, to the cent', async () => {
    liveRoomPrice.mock.mockImplementation(async () => live(163.66, 3))
    const body = validBody()
    const r = await post(body)
    assert.equal(r.status, 201)
    assert.equal(createReservation.mock.calls[0].arguments[0].total_price, 163.66)
    assert.deepEqual(recordCheckoutCharge.mock.calls[0].arguments, ['pay-1'])
    assert.deepEqual(liveRoomPrice.mock.calls[0].arguments, [
      { liteapiHotelId: 'lp1897', liteapiRoomId: '2617267', roomType: 'Standard King Room' },
      { checkIn: body.check_in, checkOut: body.check_out, adults: 2, children: [] },
    ])
  })

  test('children are priced as children, the party the stay page quoted, and saved with the booking', async () => {
    roomResult = { data: { ...LITE_ROOM, capacity: 4 }, error: null }
    liveRoomPrice.mock.mockImplementation(async () => live(198.94, 3))
    const r = await post({ ...validBody(), guests: 4, children: 2 })
    assert.equal(r.status, 201)
    assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1], {
      checkIn: validBody().check_in,
      checkOut: validBody().check_out,
      adults: 2,
      children: [8, 8],
    })
    const saved = createReservation.mock.calls[0].arguments[0]
    assert.equal(saved.guests, 4)
    assert.equal(saved.children, 2)
    assert.equal(saved.total_price, 198.94)
  })

  test('without a guest count, LiteAPI is asked for 2 adults', async () => {
    liveRoomPrice.mock.mockImplementation(async () => live(163.66, 3))
    const body = validBody()
    delete body.guests
    delete body.children
    assert.equal((await post(body)).status, 201)
    assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1].adults, 2)
    assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1].children, [])
  })

  test('sold out: 409 before the card is charged, nothing written', async () => {
    liveRoomPrice.mock.mockImplementation(async () => ({ status: 'sold_out' }))
    const r = await post(validBody())
    assert.deepEqual(r, { status: 409, json: { error: 'Room is not available for those dates.' } })
    assert.equal(writes(), 0)
  })

  test('LiteAPI unavailable: falls back to the stored price', async () => {
    const r = await post(validBody())
    assert.equal(r.status, 201)
    assert.equal(liveRoomPrice.mock.callCount(), 1)
    assert.equal(createReservation.mock.calls[0].arguments[0].total_price, 389.97)
    assert.equal(r.json.transaction.amount, 389.97)
  })

  test('an owner hotel (no liteapi_id) never calls LiteAPI', async () => {
    for (const hotels of [null, { liteapi_id: null }]) {
      roomResult = { data: { ...LITE_ROOM, liteapi_room_id: null, hotels }, error: null }
      const r = await post(validBody())
      assert.equal(r.json.reservation.total_price, 389.97)
    }
    assert.equal(liveRoomPrice.mock.callCount(), 0)
  })
})

describe('declines', () => {
  test('0002 card: 402 "Your card was declined.", nothing written or logged', async () => {
    const r = await post(withCard('4000 0000 0000 0002'))
    assert.deepEqual(r, { status: 402, json: { error: 'Your card was declined.' } })
    assert.equal(writes(), 0)
    assert.equal(consoleError.mock.callCount(), 0)
  })

  test('9995 card: 402 "Insufficient funds.", nothing written', async () => {
    const r = await post(withCard('4000-0000-0000-9995'))
    assert.deepEqual(r, { status: 402, json: { error: 'Insufficient funds.' } })
    assert.equal(writes(), 0)
  })

  test('a declined card is not retried or charged on a second attempt', async () => {
    await post(withCard('4000000000000002'))
    await post(withCard('4000000000000002'))
    assert.equal(writes(), 0)
  })
})

describe('saving the reservation', () => {
  test('409 when the room was booked first (exclusion constraint), no payment saved', async () => {
    createReservation.mock.mockImplementation(async () => ({ data: null, error: { code: '23P01' } }))
    const r = await post(validBody())
    assert.deepEqual(r, { status: 409, json: { error: 'Room is not available for those dates.' } })
    assert.equal(createPayment.mock.callCount(), 0)
    assert.equal(recordCheckoutCharge.mock.callCount(), 0)
  })

  test('500 on any other insert error, no payment saved', async () => {
    createReservation.mock.mockImplementation(async () => ({ data: null, error: { code: '42501' } }))
    const r = await post(validBody())
    assert.equal(r.status, 500)
    assert.equal(createPayment.mock.callCount(), 0)
    assert.equal(consoleError.mock.callCount(), 1)
  })

  test('500 when the insert returns no row', async () => {
    createReservation.mock.mockImplementation(async () => ({ data: [], error: null }))
    assert.equal((await post(validBody())).status, 500)
    assert.equal(createPayment.mock.callCount(), 0)
  })
})

describe('rollback when the payment cannot be recorded', () => {
  const failure = { error: 'Payment could not be recorded. You have not been charged.' }

  test('payment insert fails: reservation cancelled, no charge recorded', async () => {
    createPayment.mock.mockImplementation(async () => ({ data: null, error: { code: '42501' } }))
    const r = await post(validBody())
    assert.deepEqual(r, { status: 500, json: failure })
    assert.equal(recordCheckoutCharge.mock.callCount(), 0)
    assert.deepEqual(updateReservation.mock.calls[0].arguments, ['res-1', { status: 'cancelled' }])
  })

  test('payment insert returns no row: reservation cancelled', async () => {
    createPayment.mock.mockImplementation(async () => ({ data: [], error: null }))
    assert.equal((await post(validBody())).status, 500)
    assert.equal(updateReservation.mock.callCount(), 1)
  })

  test('charge insert fails: reservation cancelled', async () => {
    recordCheckoutCharge.mock.mockImplementation(async () => ({ data: null, error: { code: '23514' } }))
    const r = await post(validBody())
    assert.deepEqual(r, { status: 500, json: failure })
    assert.deepEqual(updateReservation.mock.calls[0].arguments, ['res-1', { status: 'cancelled' }])
  })

  test('cancelling also fails: still 500, both errors logged', async () => {
    recordCheckoutCharge.mock.mockImplementation(async () => ({ data: null, error: { code: '23514' } }))
    updateReservation.mock.mockImplementation(async () => ({ data: null, error: { code: '23514' } }))
    const r = await post(validBody())
    assert.deepEqual(r, { status: 500, json: failure })
    assert.equal(consoleError.mock.callCount(), 2)
  })
})

describe('success', () => {
  test('201 with reservation, payment and charge', async () => {
    const body = validBody()
    const r = await post(body)
    assert.equal(r.status, 201)
    assert.deepEqual(r.json, {
      reservation: {
        id: 'res-1',
        check_in: body.check_in,
        check_out: body.check_out,
        guests: 2,
        total_price: 389.97,
        status: 'confirmed',
      },
      payment: { id: 'pay-1', brand: 'visa', last4: '4242' },
      transaction: { id: 'txn-1', amount: 389.97, status: 'completed' },
    })
  })

  test('writes in order: reservation, then payment, then charge', async () => {
    await post(validBody())
    assert.deepEqual(createReservation.mock.calls[0].arguments[0], {
      account_id: 'user-1',
      hotel_id: 'hotel-1',
      room_id: 'room-1',
      check_in: validBody().check_in,
      check_out: validBody().check_out,
      total_price: 389.97,
      guests: 2,
      children: 0,
    })
    assert.deepEqual(createPayment.mock.calls[0].arguments[0], {
      reservation_id: 'res-1',
      account_id: 'user-1',
      card_number: '4242',
      card_exp_month: 12,
      card_exp_year: 2030,
    })
    assert.deepEqual(recordCheckoutCharge.mock.calls[0].arguments, ['pay-1'])
    assert.equal(updateReservation.mock.callCount(), 0)
  })

  test('account comes from the session, not the request body', async () => {
    await post({ ...validBody(), account_id: 'someone-else' })
    assert.equal(createReservation.mock.calls[0].arguments[0].account_id, 'user-1')
    assert.equal(createPayment.mock.calls[0].arguments[0].account_id, 'user-1')
  })

  test('guests is optional (database default applies)', async () => {
    const body = validBody()
    delete body.guests
    assert.equal((await post(body)).status, 201)
    assert.equal(createReservation.mock.calls[0].arguments[0].guests, undefined)
  })

  test('other valid cards are approved, with brand detected', async () => {
    const cases = [
      ['5555 5555 5555 4444', '123', 'mastercard'],
      ['3782 822463 10005', '1234', 'amex'],
      ['6011 1111 1111 1117', '123', 'discover'],
    ]
    for (const [card, cvc, brand] of cases) {
      const r = await post(withCard(card, { cvc, exp_month: '03', exp_year: '31' }))
      assert.equal(r.status, 201, card)
      assert.equal(r.json.payment.brand, brand)
      assert.equal(r.json.payment.last4, card.replace(/\s/g, '').slice(-4))
    }
  })
})

describe('card data never leaks', () => {
  const scenarios = {
    success: () => {},
    'payment insert fails': () =>
      createPayment.mock.mockImplementation(async () => ({ data: null, error: { code: 'x' } })),
    'charge insert fails': () =>
      recordCheckoutCharge.mock.mockImplementation(async () => ({ data: null, error: { code: 'x' } })),
    'reservation insert fails': () =>
      createReservation.mock.mockImplementation(async () => ({ data: null, error: { code: 'x' } })),
  }

  for (const [name, setup] of Object.entries(scenarios)) {
    test(`full number and CVC absent from DB writes, logs and response (${name})`, async () => {
      setup()
      const r = await post(validBody())
      const seen = JSON.stringify([
        r.json,
        createReservation.mock.calls.map((c) => c.arguments),
        updateReservation.mock.calls.map((c) => c.arguments),
        createPayment.mock.calls.map((c) => c.arguments),
        recordCheckoutCharge.mock.calls.map((c) => c.arguments),
        consoleError.mock.calls.map((c) => c.arguments),
      ])
      assert.equal(seen.includes(FULL_CARD), false)
      assert.equal(seen.includes('4242 4242'), false)
      assert.equal(seen.includes(CVC), false)
      assert.equal(seen.includes('Alex Rivera'), false)
    })
  }
})

// "Today" is the guest's today (from time_zone), not UTC's.
// 6pm Pacific on Oct 10 is already Oct 11 in UTC.
describe('guest time zone', () => {
  const sameDayStay = { check_in: '2026-10-10', check_out: '2026-10-12' }

  test('6pm Pacific: a same-day check-in is accepted with the guest time zone', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
    const r = await post({ ...validBody(), ...sameDayStay, time_zone: 'America/Los_Angeles' })
    assert.equal(r.status, 201)
    assert.equal(r.json.reservation.check_in, '2026-10-10')
  })

  test('without a time zone it falls back to UTC, where that day is already past', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
    const r = await post({ ...validBody(), ...sameDayStay })
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'check_in cannot be in the past.')
    assert.equal(writes(), 0)
  })
})

// Audit F8: the room's own adult/child limits, not just total capacity
describe('room adult/child limits', () => {
  test('an adults-only room rejects a child even when total capacity fits', async () => {
    roomResult = { data: { ...ROOM, capacity: 4, max_adults: 2, max_children: 0 }, error: null }
    const r = await post({ ...validBody(), guests: 3, adults: 2, children: 1 })
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'This room is for adults only.')
    assert.equal(writes(), 0)
  })

  test('too many adults is rejected', async () => {
    roomResult = { data: { ...ROOM, capacity: 4, max_adults: 1, max_children: 3 }, error: null }
    const r = await post({ ...validBody(), guests: 2, adults: 2, children: 0 })
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'This room allows up to 1 adult.')
  })

  test('guests must match adults + children', async () => {
    const r = await post({ ...validBody(), guests: 2, adults: 2, children: 1 })
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'guests must equal adults plus children.')
  })

  test('a party within the limits books', async () => {
    roomResult = { data: { ...ROOM, capacity: 4, max_adults: 2, max_children: 2 }, error: null }
    const r = await post({ ...validBody(), guests: 3, adults: 2, children: 1 })
    assert.equal(r.status, 201)
  })
})
