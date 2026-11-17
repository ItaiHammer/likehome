// Mapping and owner totals only; the rules themselves live in SQL (checked by supabase/tests/owner-history)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeOwner, toHotelBookings, toHotelCustomers, toHotelCustomerHistory } from '../lib/hotel-customers.ts'

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

const customerRow = (more = {}) => ({
  guest_id: 'guest-1',
  guest_name: 'Ana Ruiz',
  guest_email: 'ana@example.com',
  total_bookings: 3,
  cancelled_bookings: 1,
  upcoming_bookings: 1,
  nights_stayed: 3,
  total_paid: 920,
  first_stay: '2026-09-01',
  last_stay: '2026-09-01',
  next_stay: '2026-12-01',
  is_repeat: true,
  hotel_names: ['Harbor House'],
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

test('a customer row becomes a camelCase customer with numbers', () => {
  const [ana] = toHotelCustomers([customerRow({ total_bookings: '3', nights_stayed: '3', total_paid: '920.50' })])
  assert.deepEqual(ana, {
    id: 'guest-1',
    name: 'Ana Ruiz',
    email: 'ana@example.com',
    bookings: 3,
    cancelled: 1,
    upcoming: 1,
    nightsStayed: 3,
    totalSpent: 920.5,
    firstStay: '2026-09-01',
    lastStay: '2026-09-01',
    nextStay: '2026-12-01',
    isRepeat: true,
    listings: ['Harbor House'],
  })
})

test('a guest who hasn’t stayed yet keeps null first and last stays', () => {
  const [cy] = toHotelCustomers([customerRow({ first_stay: null, last_stay: null, next_stay: '2027-01-10', nights_stayed: 0 })])
  assert.equal(cy.firstStay, null)
  assert.equal(cy.lastStay, null)
  assert.equal(cy.nextStay, '2027-01-10')
})

test('customers keep the RPC’s order', () => {
  const customers = toHotelCustomers([customerRow({ guest_id: 'guest-2' }), customerRow()])
  assert.deepEqual(customers.map((c) => c.id), ['guest-2', 'guest-1'])
})

const CUSTOMERS = toHotelCustomers([
  customerRow(),
  customerRow({ guest_id: 'guest-2', total_bookings: 2, cancelled_bookings: 1, upcoming_bookings: 0, total_paid: 500, is_repeat: false }),
])

test('the owner summary adds up the customers', () => {
  assert.deepEqual(summarizeOwner(CUSTOMERS), {
    customers: 2,
    repeatCustomers: 1,
    bookings: 5,
    upcoming: 1,
    cancelled: 2,
    revenue: 1420,
  })
})

test('revenue is rounded to cents', () => {
  const customers = toHotelCustomers([customerRow({ total_paid: 0.1 }), customerRow({ total_paid: 0.2 })])
  assert.equal(summarizeOwner(customers).revenue, 0.3)
})

test('the response lists every owned listing by name, even with no bookings', () => {
  const history = toHotelCustomerHistory([], [], [
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

test('the response carries the bookings, the customers and their totals', () => {
  const history = toHotelCustomerHistory([row(), row({ reservation_id: 'b' })], [customerRow()], [])
  assert.deepEqual(Object.keys(history), ['listings', 'summary', 'customers', 'bookings'])
  assert.equal(history.bookings.length, 2)
  assert.equal(history.customers[0].name, 'Ana Ruiz')
  assert.equal(history.summary.revenue, 920)
})
