import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  summarizeCustomers,
  summarizeOwner,
  toHotelBookings,
  toHotelCustomerHistory,
} from '../lib/hotel-customers.ts'

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

test('bookings keep the RPC’s order', () => {
  const bookings = toHotelBookings([row({ reservation_id: 'b' }), row({ reservation_id: 'a', check_in: '2026-10-01' })])
  assert.deepEqual(bookings.map((b) => b.id), ['b', 'a'])
})

test('a row becomes a camelCase booking with numbers and the guest-facing code', () => {
  const [booking] = toHotelBookings(
    [row({ total_price: '420.50', amount_paid: '470.50', amount_refunded: '50', cancellation_fee: '12.5', status: 'cancelled', stage: 'cancelled', has_insurance: null })],
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

// Stages as the RPC gives them on 2026-11-05. Ana: past, upcoming, cancelled without insurance. Ben: in-stay now,
// insured cancel at another listing. Plus one booking whose account is gone.
const ROWS = [
  row({ reservation_id: 'ben-cancel', guest_id: 'guest-2', guest_name: 'Ben Ko', guest_email: 'ben@example.com', hotel_name: 'Cliff Inn', check_in: '2026-12-20', check_out: '2026-12-22', nights: 2, status: 'cancelled', stage: 'cancelled', has_insurance: true, amount_paid: 260, amount_refunded: 240, cancellation_fee: 0 }),
  row({ reservation_id: 'ana-next', check_in: '2026-12-01', check_out: '2026-12-04', nights: 3, amount_paid: 420 }),
  row({ reservation_id: 'ben-now', guest_id: 'guest-2', guest_name: 'Ben Ko', guest_email: 'ben@example.com', check_in: '2026-11-03', check_out: '2026-11-07', nights: 4, stage: 'in-stay', amount_paid: 500 }),
  row({ reservation_id: 'ana-cancel', check_in: '2026-10-10', check_out: '2026-10-12', nights: 2, status: 'cancelled', stage: 'cancelled', amount_paid: 200, cancellation_fee: 200 }),
  row({ reservation_id: 'ana-past', check_in: '2026-09-01', check_out: '2026-09-04', nights: 3, stage: 'past', amount_paid: 300 }),
  row({ reservation_id: 'gone', guest_id: null, guest_name: null, guest_email: null, check_in: '2026-06-01', check_out: '2026-06-02', nights: 1, stage: 'past', amount_paid: 100 }),
]
const BOOKINGS = toHotelBookings(ROWS)

test('bookings are grouped per guest, newest check-in first', () => {
  assert.deepEqual(summarizeCustomers(BOOKINGS).map((c) => c.id), ['guest-2', 'guest-1', null])
})

test('a customer counts bookings, cancellations, upcoming stays and nights actually stayed', () => {
  const [ben, ana] = summarizeCustomers(BOOKINGS)
  assert.deepEqual(ana, {
    id: 'guest-1',
    name: 'Ana Ruiz',
    email: 'ana@example.com',
    bookings: 3,
    cancelled: 1,
    upcoming: 1,
    nightsStayed: 3,
    totalSpent: 920,
    firstStay: '2026-09-01',
    lastStay: '2026-09-01',
    nextStay: '2026-12-01',
    isRepeat: true,
    listings: ['Harbor House'],
  })
  assert.equal(ben.nightsStayed, 4)
  assert.equal(ben.lastStay, '2026-11-03')
  assert.equal(ben.nextStay, null)
})

test('refunds come off what a customer spent, and a cancelled stay does not make them a repeat guest', () => {
  const [ben] = summarizeCustomers(BOOKINGS)
  assert.equal(ben.totalSpent, 520)
  assert.equal(ben.bookings, 2)
  assert.equal(ben.isRepeat, false)
  assert.deepEqual(ben.listings, ['Cliff Inn', 'Harbor House'])
})

test('bookings without an account become one nameless customer', () => {
  const extra = toHotelBookings([row({ reservation_id: 'gone-2', guest_id: null, guest_name: null, guest_email: null })])
  const gone = summarizeCustomers([...BOOKINGS, ...extra]).filter((c) => c.id === null)
  assert.equal(gone.length, 1)
  assert.equal(gone[0].bookings, 2)
  assert.equal(gone[0].name, null)
})

test('totals are rounded to cents', () => {
  const bookings = toHotelBookings([row({ amount_paid: 0.1 }), row({ amount_paid: 0.2 })])
  assert.equal(summarizeCustomers(bookings)[0].totalSpent, 0.3)
  assert.equal(summarizeOwner(bookings, summarizeCustomers(bookings)).revenue, 0.3)
})

test('the owner summary adds up every customer and booking', () => {
  assert.deepEqual(summarizeOwner(BOOKINGS, summarizeCustomers(BOOKINGS)), {
    customers: 3,
    repeatCustomers: 1,
    bookings: 6,
    upcoming: 1,
    cancelled: 2,
    revenue: 1540,
  })
})

test('the response lists every owned listing by name, even with no bookings', () => {
  const history = toHotelCustomerHistory([], [
    { id: 'h2', name: 'Harbor House', owner_id: 'owner-1', city: 'Monterey' },
    { id: 'h1', name: 'Cliff Inn', owner_id: 'owner-1', city: 'Carmel' },
  ])
  assert.deepEqual(history, {
    listings: [{ id: 'h1', name: 'Cliff Inn' }, { id: 'h2', name: 'Harbor House' }],
    summary: { customers: 0, repeatCustomers: 0, bookings: 0, upcoming: 0, cancelled: 0, revenue: 0 },
    customers: [],
    bookings: [],
  })
})

test('the response carries the shaped bookings and their customers', () => {
  const history = toHotelCustomerHistory(ROWS, [])
  assert.equal(history.bookings.length, 6)
  assert.equal(history.customers.length, 3)
  assert.deepEqual(history.bookings.filter((b) => b.guestId === 'guest-1').map((b) => b.stage), ['upcoming', 'cancelled', 'past'])
})
