// Tests for POST /api/checkout — run with `npm test`
// Database checkout is performed via checkoutReservation RPC wrapper.
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

let userId
let roomResult
const checkoutReservation = mock.fn()
const consoleError = mock.method(console, 'error', () => {})

mock.module('next/headers', { namedExports: { cookies: async () => ({}) } })
mock.module('@/utils/user', {
  namedExports: {
    getUserId: async () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => roomResult,
            }),
          }),
        }),
      },
      userId,
    }),
  },
})
mock.module('@/utils/reservations', {
  namedExports: {
    checkoutReservation,
    getCancelInsurancePremium: () => 20,
  },
})

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
  has_insurance: false,
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

const checkoutCalls = () => checkoutReservation.mock.callCount()

beforeEach(() => {
  userId = 'user-1'
  roomResult = { data: { ...ROOM }, error: null }
  checkoutReservation.mock.resetCalls()
  consoleError.mock.resetCalls()

  checkoutReservation.mock.mockImplementation(async (stay, payment, options) => {
    const totalPrice = payment.total_price
    const insurancePremium = payment.insurance_premium
    const hasInsurance = payment.has_insurance
    return {
      data: {
        reservation: {
          id: 'res-1',
          check_in: stay.check_in,
          check_out: stay.check_out,
          guests: stay.guests,
          total_price: totalPrice,
          status: 'confirmed',
          has_insurance: hasInsurance,
        },
        payment: { id: 'pay-1', card_number: payment.card_last4 },
        transaction: { id: 'txn-1', amount: totalPrice, status: 'completed' },
        insurance_premium: insurancePremium,
        total_charged: Math.round((totalPrice + insurancePremium) * 100) / 100,
      },
      error: null,
    }
  })
})

describe('auth', () => {
  test('401 when signed out, nothing written', async () => {
    userId = null
    const r = await post(validBody())
    assert.equal(r.status, 401)
    assert.equal(r.json.error, 'You must be logged in to book.')
    assert.equal(checkoutCalls(), 0)
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

  test('400 when has_insurance is not a boolean', async () => {
    for (const has_insurance of ['true', 1, null, {}]) {
      const r = await post({ ...validBody(), has_insurance })
      assert.equal(r.status, 400)
      assert.equal(r.json.error, 'has_insurance must be true or false.')
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
    ]
    for (const patch of cases) {
      const r = await post({ ...validBody(), ...patch })
      assert.equal(r.status, 400, JSON.stringify(patch))
    }
    assert.equal(checkoutCalls(), 0)
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
    assert.equal(checkoutCalls(), 0)
  })
})

describe('room', () => {
  test('404 when the room lookup errors or finds nothing', async () => {
    roomResult = { data: null, error: { code: 'PGRST116' } }
    assert.equal((await post(validBody())).status, 404)
    roomResult = { data: null, error: null }
    assert.equal((await post(validBody())).status, 404)
    assert.equal(checkoutCalls(), 0)
  })

  test('400 when guests exceed room capacity', async () => {
    const r = await post({ ...validBody(), guests: 3 })
    assert.equal(r.status, 400)
    assert.match(r.json.error, /fits up to 2/)
    assert.equal(checkoutCalls(), 0)
  })
})

describe('pricing & insurance', () => {
  test('price comes from the database, never the request', async () => {
    const r = await post({ ...validBody(), total_price: 1, price_per_night: 1 })
    assert.equal(r.status, 201)
    assert.equal(checkoutReservation.mock.calls[0].arguments[1].total_price, 389.97)
    assert.equal(r.json.reservation.total_price, 389.97)
  })

  test('handles a numeric-string price from Postgres', async () => {
    roomResult = { data: { ...ROOM, price_per_night: '100.00' }, error: null }
    const r = await post(validBody())
    assert.equal(r.json.reservation.total_price, 300)
  })

  test('422 when the room price is zero or invalid', async () => {
    for (const price_per_night of [0, null]) {
      roomResult = { data: { ...ROOM, price_per_night }, error: null }
      const r = await post(validBody())
      assert.equal(r.status, 422)
      assert.equal(r.json.error, 'The room does not have a valid booking price.')
    }
    assert.equal(checkoutCalls(), 0)
  })

  test('calculates cancel insurance premium (20) when has_insurance is true', async () => {
    const r = await post({ ...validBody(), has_insurance: true })
    assert.equal(r.status, 201)
    assert.equal(r.json.insurance_premium, 20)
    assert.equal(r.json.total_charged, 409.97)
    assert.equal(checkoutReservation.mock.calls[0].arguments[1].has_insurance, true)
    assert.equal(checkoutReservation.mock.calls[0].arguments[1].insurance_premium, 20)
  })

  test('defaults to 0 insurance premium when has_insurance is false or omitted', async () => {
    const r = await post(validBody())
    assert.equal(r.status, 201)
    assert.equal(r.json.insurance_premium, 0)
    assert.equal(r.json.total_charged, 389.97)
    assert.equal(checkoutReservation.mock.calls[0].arguments[1].has_insurance, false)
    assert.equal(checkoutReservation.mock.calls[0].arguments[1].insurance_premium, 0)
  })
})

describe('declines', () => {
  test('0002 card: 402 "Your card was declined.", nothing written or logged', async () => {
    const r = await post(withCard('4000 0000 0000 0002'))
    assert.deepEqual(r, { status: 402, json: { error: 'Your card was declined.' } })
    assert.equal(checkoutCalls(), 0)
    assert.equal(consoleError.mock.callCount(), 0)
  })

  test('9995 card: 402 "Insufficient funds.", nothing written', async () => {
    const r = await post(withCard('4000-0000-0000-9995'))
    assert.deepEqual(r, { status: 402, json: { error: 'Insufficient funds.' } })
    assert.equal(checkoutCalls(), 0)
  })

  test('a declined card is not retried or charged on a second attempt', async () => {
    await post(withCard('4000000000000002'))
    await post(withCard('4000000000000002'))
    assert.equal(checkoutCalls(), 0)
  })
})

describe('checkoutReservation RPC errors', () => {
  test('409 when the room is not available for those dates (exclusion constraint 23P01)', async () => {
    checkoutReservation.mock.mockImplementation(async () => ({
      data: null,
      error: { code: '23P01' },
    }))
    const r = await post(validBody())
    assert.deepEqual(r, { status: 409, json: { error: 'Room is not available for those dates.' } })
  })

  test('mapped status codes (PT400, PT401, PT404, PT409) return mapped status and error message', async () => {
    const mapped = [
      ['PT400', 400, 'Choose valid dates for a stay of 1 to 30 nights.'],
      ['PT401', 401, 'You must be logged in to book.'],
      ['PT404', 404, 'Room not found.'],
      ['PT409', 409, 'The booking price changed. Refresh and try again.'],
    ]
    for (const [code, status, message] of mapped) {
      checkoutReservation.mock.mockImplementation(async () => ({
        data: null,
        error: { code, message },
      }))
      const r = await post(validBody())
      assert.equal(r.status, status)
      assert.equal(r.json.error, message)
    }
  })

  test('500 on unmapped RPC error code, error logged', async () => {
    checkoutReservation.mock.mockImplementation(async () => ({
      data: null,
      error: { code: 'P0001', message: 'Database failure' },
    }))
    const r = await post(validBody())
    assert.equal(r.status, 500)
    assert.equal(r.json.error, 'Could not complete checkout.')
    assert.equal(consoleError.mock.callCount(), 1)
  })

  test('500 when RPC returns no reservation or transaction data', async () => {
    checkoutReservation.mock.mockImplementation(async () => ({
      data: { reservation: null, transaction: null },
      error: null,
    }))
    const r = await post(validBody())
    assert.equal(r.status, 500)
    assert.equal(r.json.error, 'Could not complete checkout.')
  })
})

describe('success', () => {
  test('201 with reservation, payment, transaction, insurance_premium, total_charged', async () => {
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
        has_insurance: false,
      },
      payment: { id: 'pay-1', last4: '4242' },
      transaction: { id: 'txn-1', amount: 389.97, status: 'completed' },
      insurance_premium: 0,
      total_charged: 389.97,
    })
  })

  test('checkoutReservation called with expected parameters', async () => {
    await post(validBody())
    assert.equal(checkoutReservation.mock.callCount(), 1)
    const [stay, paymentDetails, options] = checkoutReservation.mock.calls[0].arguments
    assert.deepEqual(stay, {
      account_id: 'user-1',
      room_id: 'room-1',
      check_in: validBody().check_in,
      check_out: validBody().check_out,
      guests: 2,
    })
    assert.deepEqual(paymentDetails, {
      total_price: 389.97,
      has_insurance: false,
      insurance_premium: 0,
      card_last4: '4242',
      exp_month: 12,
      exp_year: 2030,
    })
    assert.deepEqual(options, {
      time_zone: null,
    })
  })

  test('account comes from the session, not the request body', async () => {
    await post({ ...validBody(), account_id: 'someone-else' })
    assert.equal(checkoutReservation.mock.calls[0].arguments[0].account_id, 'user-1')
  })

  test('guests is optional (database default applies)', async () => {
    const body = validBody()
    delete body.guests
    assert.equal((await post(body)).status, 201)
    assert.equal(checkoutReservation.mock.calls[0].arguments[0].guests, undefined)
  })

  test('other valid cards are approved', async () => {
    const cases = [
      ['5555 5555 5555 4444', '123'],
      ['3782 822463 10005', '1234'],
      ['6011 1111 1111 1117', '123'],
    ]
    for (const [card, cvc] of cases) {
      const r = await post(withCard(card, { cvc, exp_month: '03', exp_year: '31' }))
      assert.equal(r.status, 201, card)
      assert.equal(r.json.payment.last4, card.replace(/\s/g, '').slice(-4))
    }
  })
})

describe('card data never leaks', () => {
  test('full number and CVC absent from checkoutReservation args, logs and response', async () => {
    const r = await post(validBody())
    const seen = JSON.stringify([
      r.json,
      checkoutReservation.mock.calls.map((c) => c.arguments),
      consoleError.mock.calls.map((c) => c.arguments),
    ])
    assert.equal(seen.includes(FULL_CARD), false)
    assert.equal(seen.includes('4242 4242'), false)
    assert.equal(seen.includes(CVC), false)
    assert.equal(seen.includes('Alex Rivera'), false)
  })
})

describe('guest time zone', () => {
  const sameDayStay = { check_in: '2026-10-10', check_out: '2026-10-12' }

  test('6pm Pacific: a same-day check-in is accepted with the guest time zone', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
    const r = await post({ ...validBody(), ...sameDayStay, time_zone: 'America/Los_Angeles' })
    assert.equal(r.status, 201)
    assert.equal(checkoutReservation.mock.calls[0].arguments[2].time_zone, 'America/Los_Angeles')
  })

  test('without a time zone it falls back to UTC, where that day is already past', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
    const r = await post({ ...validBody(), ...sameDayStay })
    assert.equal(r.status, 400)
    assert.equal(r.json.error, 'check_in cannot be in the past.')
    assert.equal(checkoutCalls(), 0)
  })
})