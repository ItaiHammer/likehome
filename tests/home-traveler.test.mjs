// Tests for lib/home-traveler.ts (the personal homepage's summary cards). Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { nextTrip, tripLabel, pointsSummary, inboxHint, POINTS_PER_DOLLAR } = await import('../lib/home-traveler.ts')

const TODAY = '2026-11-20'
const booking = (id, checkIn, checkOut, status = 'confirmed') => ({
  id,
  checkIn,
  checkOut,
  guests: 2,
  status,
  hotelName: `Hotel ${id}`,
  city: null,
  photoUrl: null,
  roomType: null,
})

// Which stays count as upcoming, and their order, is groupBookings' (tests/bookings.test.mjs)
test('next trip: the first stay My Bookings lists as upcoming', () => {
  const trips = [booking('late', '2026-12-20', '2026-12-22'), booking('now', '2026-11-18', '2026-11-22'), booking('soon', '2026-12-03', '2026-12-06')]
  assert.equal(nextTrip(trips, TODAY).id, 'now')
})

test('next trip: an upcoming stay that isn’t confirmed is skipped', () => {
  const pending = booking('pending', '2026-11-25', '2026-11-27', 'pending')
  assert.equal(nextTrip([pending, booking('next', '2026-12-03', '2026-12-06')], TODAY).id, 'next')
  assert.equal(nextTrip([pending], TODAY), null)
})

test('trip label: Today, Tomorrow, then a day count', () => {
  assert.equal(tripLabel(TODAY, TODAY), 'Next trip · Today')
  assert.equal(tripLabel('2026-11-21', TODAY), 'Next trip · Tomorrow')
  assert.equal(tripLabel('2026-12-03', TODAY), 'Next trip · in 13 days')
})

test('trip label: counts across a month and a year end', () => {
  assert.equal(tripLabel('2027-01-02', '2026-12-30'), 'Next trip · in 3 days')
})

test('trip label: a stay that has started', () => {
  assert.equal(tripLabel('2026-11-18', TODAY), 'Staying now')
})

test('points: worth a dollar per hundred, as the database redeems them', () => {
  assert.equal(POINTS_PER_DOLLAR, 100)
  assert.deepEqual(pointsSummary(1240), { value: '1,240', line: 'Worth $12.40 toward a stay' })
  assert.deepEqual(pointsSummary(500), { value: '500', line: 'Worth $5 toward a stay' })
  assert.deepEqual(pointsSummary(7), { value: '7', line: 'Worth $0.07 toward a stay' })
})

test('points: none yet', () => {
  assert.deepEqual(pointsSummary(0), { value: '0', line: 'Earn points on every night you book.' })
})

test('points: a failed read shows no balance, and says so', () => {
  assert.deepEqual(pointsSummary(null), { value: null, line: 'We couldn’t load your points just now.' })
})

test('inbox hint: unread count, nothing new, or the fallback when the read failed', () => {
  assert.equal(inboxHint(2, 'fallback'), '2 unread from your hotels')
  assert.equal(inboxHint(1, 'fallback'), '1 unread from your hotels')
  assert.equal(inboxHint(1200, 'fallback'), '1,200 unread from your hotels')
  assert.equal(inboxHint(0, 'fallback'), 'No new messages')
  assert.equal(inboxHint(null, 'fallback'), 'fallback')
})
