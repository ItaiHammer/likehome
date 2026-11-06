import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bookingStage, isUnpaidCheckoutFailure, toHotelBookings } from '../lib/hotel-customers.ts'

const TODAY = '2026-11-05'

const row = (more = {}) => ({
  reservation_id: '3f2a9c1e-0b7d-4e5f-8a6b-1c2d3e4f5a6b',
  hotel_id: 'hotel-1',
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
  total_price: 420,
  has_insurance: false,
  cancelled_at: null,
  cancellation_fee: null,
  amount_paid: 420,
  amount_refunded: 0,
  booked_at: '2026-10-20T18:00:00+00:00',
  ...more,
})

test('a confirmed stay is upcoming, in-stay or past around today', () => {
  assert.equal(bookingStage(row({ check_in: '2026-11-10', check_out: '2026-11-12' }), TODAY), 'upcoming')
  assert.equal(bookingStage(row({ check_in: '2026-11-03', check_out: '2026-11-07' }), TODAY), 'in-stay')
  assert.equal(bookingStage(row({ check_in: '2026-10-01', check_out: '2026-10-03' }), TODAY), 'past')
})

test('check-in day is in-stay and check-out day is past', () => {
  assert.equal(bookingStage(row({ check_in: TODAY, check_out: '2026-11-08' }), TODAY), 'in-stay')
  assert.equal(bookingStage(row({ check_in: '2026-11-02', check_out: TODAY }), TODAY), 'past')
})

test('cancelled wins over the dates, and completed is past', () => {
  assert.equal(bookingStage(row({ status: 'cancelled' }), TODAY), 'cancelled')
  assert.equal(bookingStage(row({ status: 'completed' }), TODAY), 'past')
})

test('a cancelled booking with no fee and nothing paid is a failed checkout', () => {
  assert.equal(isUnpaidCheckoutFailure(row({ status: 'cancelled', amount_paid: 0 })), true)
  assert.equal(isUnpaidCheckoutFailure(row({ status: 'cancelled', amount_paid: '0.00' })), true)
})

test('real cancellations and unpaid confirmed bookings are not failed checkouts', () => {
  // Insured and fully refunded: the fee is 0, not null
  assert.equal(isUnpaidCheckoutFailure(row({ status: 'cancelled', cancellation_fee: 0, amount_refunded: 420 })), false)
  assert.equal(isUnpaidCheckoutFailure(row({ status: 'cancelled', cancellation_fee: 420 })), false)
  assert.equal(isUnpaidCheckoutFailure(row({ amount_paid: 0 })), false)
})

test('failed checkouts are dropped and the order is kept', () => {
  const bookings = toHotelBookings(
    [
      row({ reservation_id: 'b', check_in: '2026-12-01' }),
      row({ reservation_id: 'failed', status: 'cancelled', amount_paid: 0 }),
      row({ reservation_id: 'a', check_in: '2026-10-01', check_out: '2026-10-03' }),
    ],
    TODAY,
  )
  assert.deepEqual(bookings.map((b) => b.id), ['b', 'a'])
})

test('a row becomes a camelCase booking with numbers and the guest-facing code', () => {
  const [booking] = toHotelBookings(
    [row({ total_price: '420.50', amount_paid: '470.50', amount_refunded: '50', cancellation_fee: '12.5', status: 'cancelled', has_insurance: null })],
    TODAY,
  )
  assert.deepEqual(booking, {
    id: '3f2a9c1e-0b7d-4e5f-8a6b-1c2d3e4f5a6b',
    code: 'LH-3F2A9C1E',
    hotelId: 'hotel-1',
    hotelName: 'Harbor House',
    roomType: 'Double',
    guestId: 'guest-1',
    guestName: 'Ana Ruiz',
    guestEmail: 'ana@example.com',
    checkIn: '2026-12-01',
    checkOut: '2026-12-04',
    nights: 3,
    guests: 2,
    children: 0,
    stage: 'cancelled',
    totalPrice: 420.5,
    amountPaid: 470.5,
    amountRefunded: 50,
    cancellationFee: 12.5,
    hasInsurance: false,
    bookedAt: '2026-10-20T18:00:00+00:00',
    cancelledAt: null,
  })
})
