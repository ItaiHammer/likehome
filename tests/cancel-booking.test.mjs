// Tests for the cancelBooking server action and the sample cancellation quotes — run with `npm test`
// getUserId and cancelReservation are mocked; the database's own rules are tested in cancellation_insurance.sql.
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

let userId
let cancelResult
const cancelReservation = mock.fn(async () => cancelResult)
const consoleError = mock.method(console, 'error', () => {})
mock.module('@/utils/user', { namedExports: { getUserId: async () => ({ supabase: {}, userId }) } })
mock.module('@/utils/reservations', { namedExports: { cancelReservation } })

const { cancelBooking } = await import('../app/MyBookings/actions.ts')
const { getSampleBookings, getSampleQuote } = await import('../app/MyBookings/sampleBookings.ts')

const ID = '48291c0e-7a3d-4f55-9b1e-2c6d8e0f4a17'
const TRY_AGAIN = 'We couldn’t cancel your reservation. Try again.'

describe('cancelBooking', () => {
  beforeEach(() => {
    userId = 'user-1'
    cancelResult = { data: null, error: null }
    cancelReservation.mock.resetCalls()
    consoleError.mock.resetCalls()
  })

  test('signed out: asks to sign in and never calls the database', async () => {
    userId = null
    assert.deepEqual(await cancelBooking(ID), { status: 'signedOut' })
    assert.equal(cancelReservation.mock.callCount(), 0)
  })

  test('a non-string id is refused before the database', async () => {
    assert.deepEqual(await cancelBooking({ id: ID }), { status: 'failed', message: TRY_AGAIN })
    assert.deepEqual(await cancelBooking(undefined), { status: 'failed', message: TRY_AGAIN })
    assert.equal(cancelReservation.mock.callCount(), 0)
  })

  test('insured: passes the refund and points back as numbers', async () => {
    cancelResult = { data: { refund: '756.00', cancellation_fee: '0', refund_points: 75600 }, error: null }
    assert.deepEqual(await cancelBooking(ID), { status: 'cancelled', refund: 756, refundPoints: 75600 })
    assert.deepEqual(cancelReservation.mock.calls[0].arguments, [ID])
  })

  test('uninsured: cancelled with no refund and no points', async () => {
    cancelResult = { data: { refund: 0, cancellation_fee: 567, refund_points: 0 }, error: null }
    assert.deepEqual(await cancelBooking(ID), { status: 'cancelled', refund: 0, refundPoints: 0 })
  })

  test('too late or already cancelled (P0001): says so, without logging an error', async () => {
    cancelResult = { data: null, error: { code: 'P0001', message: 'This booking can no longer be cancelled' } }
    assert.deepEqual(await cancelBooking(ID), { status: 'failed', message: 'This reservation can no longer be cancelled.' })
    assert.equal(consoleError.mock.callCount(), 0)
  })

  test('not found or any other database error: generic message, logged', async () => {
    cancelResult = { data: null, error: { code: 'P0002', message: 'Reservation not found' } }
    assert.deepEqual(await cancelBooking(ID), { status: 'failed', message: TRY_AGAIN })
    cancelResult = { data: null, error: { code: '22P02', message: 'invalid input syntax for type uuid' } }
    assert.deepEqual(await cancelBooking('not-a-uuid'), { status: 'failed', message: TRY_AGAIN })
    assert.equal(consoleError.mock.callCount(), 2)
  })

  test('no row and no error: treated as a failure', async () => {
    assert.deepEqual(await cancelBooking(ID), { status: 'failed', message: TRY_AGAIN })
  })
})

describe('sample cancellation quotes', () => {
  const today = '2026-10-21'
  const byName = Object.fromEntries(getSampleBookings(today).bookings.map((b) => [b.hotelName, b]))

  test('Sunset Beach is insured: 4 nights at $189 come back as points', () => {
    assert.deepEqual(getSampleQuote(byName['Sunset Beach Resort'], today), {
      hasInsurance: true,
      canCancel: true,
      bookingPaid: 756,
      insurancePaid: 38,
      refund: 756,
      refundPoints: 75600,
    })
  })

  test('Alpine Lodge is uninsured: 3 nights paid, nothing back', () => {
    assert.deepEqual(getSampleQuote(byName['Alpine Lodge'], today), {
      hasInsurance: false,
      canCancel: true,
      bookingPaid: 567,
      insurancePaid: 0,
      refund: 0,
      refundPoints: 0,
    })
  })

  test('cancelled, past and check-in-today stays cannot be cancelled', () => {
    assert.equal(getSampleQuote(byName['The Brooklyn Loft'], today).canCancel, false)
    assert.equal(getSampleQuote(byName['Casa del Sol'], today).canCancel, false)
    assert.equal(getSampleQuote({ ...byName['Alpine Lodge'], checkIn: today }, today).canCancel, false)
  })
})
