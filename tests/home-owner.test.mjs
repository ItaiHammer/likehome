// Tests for lib/home-owner.ts (the business homepage's guests card and stat tiles). Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { shortGuestName, ownerGuests, ownerStats, statsSubtitle, GUESTS_SHOWN } = await import('../lib/home-owner.ts')

const booking = (id, stage, checkIn, checkOut, extra = {}) => ({
  id,
  stage,
  checkIn,
  checkOut,
  guestName: 'Dana Reyes',
  roomType: 'Garden room',
  hotelName: 'Bayview Grand Hotel',
  ...extra,
})

const summary = { customers: 41, repeatCustomers: 9, bookings: 64, upcoming: 3, cancelled: 5, revenue: 18420 }

test('guest name: first name and last initial', () => {
  assert.equal(shortGuestName('Elena Kowalski'), 'Elena K.')
  assert.equal(shortGuestName('  Mary Ann   smith '), 'Mary S.')
  assert.equal(shortGuestName('Priya'), 'Priya')
})

test('guest name: blank or missing reads "Guest"', () => {
  for (const name of [null, undefined, '', '   ']) assert.equal(shortGuestName(name), 'Guest')
})

test('guests: staying now by who leaves first, with the checkout date', () => {
  const { staying } = ownerGuests([
    booking('b', 'in-stay', '2026-11-18', '2026-11-24'),
    booking('a', 'in-stay', '2026-11-19', '2026-11-22', { guestName: 'Elena Kowalski', roomType: 'Loft suite' }),
    booking('x', 'past', '2026-10-01', '2026-10-03'),
  ])
  assert.deepEqual(staying, {
    rows: [
      { id: 'a', guest: 'Elena K.', stay: 'Loft suite · Bayview Grand Hotel', dates: 'until Nov 22' },
      { id: 'b', guest: 'Dana R.', stay: 'Garden room · Bayview Grand Hotel', dates: 'until Nov 24' },
    ],
    more: 0,
  })
})

test('guests: arriving soonest first, at most three, and how many more', () => {
  const { arriving } = ownerGuests([
    booking('d', 'upcoming', '2026-12-20', '2026-12-22'),
    booking('b', 'upcoming', '2026-12-05', '2026-12-09'),
    booking('c', 'upcoming', '2026-12-11', '2026-12-12'),
    booking('a', 'upcoming', '2026-12-03', '2026-12-06'),
    booking('z', 'cancelled', '2026-12-01', '2026-12-02'),
  ])
  assert.equal(GUESTS_SHOWN, 3)
  assert.deepEqual(arriving.rows.map((r) => r.id), ['a', 'b', 'c'])
  assert.equal(arriving.rows[0].dates, 'Dec 3 - 6, 2026')
  assert.equal(arriving.more, 1)
})

test('guests: a booking without a room type shows the hotel alone', () => {
  const { arriving } = ownerGuests([booking('a', 'upcoming', '2026-12-03', '2026-12-06', { roomType: null })])
  assert.equal(arriving.rows[0].stay, 'Bayview Grand Hotel')
})

test('guests: nobody staying or arriving', () => {
  assert.deepEqual(ownerGuests([]), { staying: { rows: [], more: 0 }, arriving: { rows: [], more: 0 } })
})

test('stats: the four tiles from the owner summary', () => {
  const stats = ownerStats(summary, [booking('b', 'upcoming', '2026-12-05', '2026-12-09'), booking('a', 'upcoming', '2026-12-03', '2026-12-06')])
  assert.deepEqual(stats, [
    { label: 'Paid to you', value: '$18,420', detail: 'after refunds' },
    { label: 'Bookings', value: '64', detail: '5 cancelled' },
    { label: 'Upcoming stays', value: '3', detail: 'Next check-in Dec 3' },
    { label: 'Guests', value: '41', detail: '9 booked more than once' },
  ])
})

test('stats: no upcoming stays, cents kept, big numbers grouped', () => {
  const stats = ownerStats({ ...summary, upcoming: 0, revenue: 1234.5, bookings: 1200 }, [booking('a', 'past', '2026-10-01', '2026-10-03')])
  assert.equal(stats[0].value, '$1,234.50')
  assert.equal(stats[1].value, '1,200')
  assert.equal(stats[2].detail, 'None yet')
})

test('stats subtitle: one property or several', () => {
  assert.equal(statsSubtitle(1), 'For your property, since you listed it.')
  assert.equal(statsSubtitle(2), 'Across your 2 properties, since you listed them.')
})
