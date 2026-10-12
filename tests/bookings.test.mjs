import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bookingCode,
  bookingSummary,
  findOverlap,
  firstName,
  formatStayDates,
  groupBookings,
  initials,
  money,
  overlapMessage,
} from '../lib/bookings.ts'

const TODAY = '2026-10-10'
const booking = (id, checkIn, checkOut, status = 'confirmed') => ({
  id,
  checkIn,
  checkOut,
  status,
  guests: 2,
  hotelName: 'Casa del Sol',
  city: 'Barcelona',
  photoUrl: null,
  roomType: 'Ocean studio',
})

test('groups bookings into upcoming, past and cancelled', () => {
  const { upcoming, past, cancelled } = groupBookings(
    [
      booking('future', '2026-10-20', '2026-10-24'),
      booking('old', '2026-06-04', '2026-06-08'),
      booking('called-off', '2026-11-01', '2026-11-03', 'cancelled'),
    ],
    TODAY
  )
  assert.deepEqual(upcoming.map((b) => b.id), ['future'])
  assert.deepEqual(past.map((b) => b.id), ['old'])
  assert.deepEqual(cancelled.map((b) => b.id), ['called-off'])
})

test('a stay under way is upcoming; one that checks out today is past', () => {
  const { upcoming, past } = groupBookings(
    [booking('staying', '2026-10-08', '2026-10-12'), booking('leaving', '2026-10-07', TODAY)],
    TODAY
  )
  assert.deepEqual(upcoming.map((b) => b.id), ['staying'])
  assert.deepEqual(past.map((b) => b.id), ['leaving'])
})

test('a completed booking is past even if its dates are ahead', () => {
  const { upcoming, past } = groupBookings([booking('done', '2026-10-20', '2026-10-24', 'completed')], TODAY)
  assert.equal(upcoming.length, 0)
  assert.deepEqual(past.map((b) => b.id), ['done'])
})

test('upcoming is soonest first, past is newest first', () => {
  const { upcoming, past } = groupBookings(
    [
      booking('later', '2026-12-01', '2026-12-03'),
      booking('sooner', '2026-10-15', '2026-10-17'),
      booking('2025', '2025-09-18', '2025-09-21'),
      booking('2026', '2026-06-04', '2026-06-08'),
    ],
    TODAY
  )
  assert.deepEqual(upcoming.map((b) => b.id), ['sooner', 'later'])
  assert.deepEqual(past.map((b) => b.id), ['2026', '2025'])
})

test('formats stay dates within a month, across months and across years', () => {
  assert.equal(formatStayDates('2026-10-12', '2026-10-16'), 'Oct 12 - 16, 2026')
  assert.equal(formatStayDates('2026-09-28', '2026-10-02'), 'Sep 28 - Oct 2, 2026')
  assert.equal(formatStayDates('2026-12-30', '2027-01-02'), 'Dec 30, 2026 - Jan 2, 2027')
})

test('booking code comes from the reservation id', () => {
  assert.equal(bookingCode('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90'), 'LH-3F2A9C1E')
})

test('summary leaves out a missing room or guest count', () => {
  assert.equal(bookingSummary(booking('a', '2026-10-12', '2026-10-16')), 'Oct 12 - 16, 2026 · Ocean studio · 2 guests')
  assert.equal(bookingSummary({ ...booking('b', '2026-10-12', '2026-10-16'), roomType: null, guests: 1 }), 'Oct 12 - 16, 2026 · 1 guest')
  assert.equal(bookingSummary({ ...booking('c', '2026-10-12', '2026-10-16'), guests: null }), 'Oct 12 - 16, 2026 · Ocean studio')
})

test('first name and initials', () => {
  assert.equal(firstName('Alex Morgan'), 'Alex')
  assert.equal(firstName('  '), null)
  assert.equal(firstName(null), null)
  assert.equal(initials('Alex Morgan', 'alex@example.com'), 'AM')
  assert.equal(initials('Cher', null), 'C')
  assert.equal(initials(null, 'nolan@example.com'), 'N')
  assert.equal(initials(null, null), '?')
})

test('finds a booking at another hotel that the new dates overlap', () => {
  const others = [
    { checkIn: '2026-10-20', checkOut: '2026-10-23', hotelName: 'Casa del Sol' },
    { checkIn: '2026-11-02', checkOut: '2026-11-05', hotelName: 'Alpine Lodge' },
  ]
  assert.equal(findOverlap(others, '2026-10-22', '2026-10-25')?.hotelName, 'Casa del Sol')
  assert.equal(findOverlap(others, '2026-10-30', '2026-11-03')?.hotelName, 'Alpine Lodge')
  // Back to back is fine: check-out day is free
  assert.equal(findOverlap(others, '2026-10-23', '2026-10-26'), null)
  assert.equal(findOverlap(others, '2026-10-17', '2026-10-20'), null)
  assert.equal(findOverlap([], '2026-10-22', '2026-10-25'), null)
})

test('the overlap message names the other hotel and its dates', () => {
  assert.equal(
    overlapMessage({ checkIn: '2026-10-20', checkOut: '2026-10-23', hotelName: 'Casa del Sol' }),
    'You already have a booking at Casa del Sol for Oct 20 - 23, 2026. Pick dates that don’t overlap it.'
  )
})

test('money shows cents only when there are some', () => {
  assert.equal(money(756), '$756')
  assert.equal(money(1234.5), '$1,234.50')
  assert.equal(money(569.97), '$569.97')
  assert.equal(money(64.4 * 15), '$966')
})
