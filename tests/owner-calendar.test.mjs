// Tests for lib/owner-calendar.ts (the owner's booking calendar). Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const cal = await import('../lib/owner-calendar.ts')
const { monthCells, formatMonth, shiftMonth, monthOf } = await import('../app/_components/dates.ts')

const booking = (over) => ({
  id: 'r1',
  code: 'LH-R1',
  hotelId: 'inn',
  hotelName: 'Messages Test Inn',
  roomType: 'Standard king',
  guestId: 'g1',
  guestName: 'Jordan Diaz',
  guestEmail: null,
  checkIn: '2026-12-04',
  checkOut: '2026-12-06',
  nights: 2,
  guests: 2,
  children: 0,
  stage: 'upcoming',
  totalPrice: 300,
  amountPaid: 300,
  amountRefunded: 0,
  cancellationFee: null,
  hasInsurance: false,
  bookedAt: '2026-11-01T00:00:00Z',
  cancelledAt: null,
  ...over,
})

const listings = [
  { id: 'loft', name: 'Harbor Loft', rooms: [{ roomCount: 3 }] },
  { id: 'inn', name: 'Messages Test Inn', rooms: [{ roomCount: 3 }, { roomCount: 2 }] },
]

test('properties are sorted by name, total their rooms and keep a colour', () => {
  const props = cal.calendarProperties([listings[1], listings[0]])
  assert.deepEqual(props, [
    { id: 'loft', name: 'Harbor Loft', rooms: 3, color: 0 },
    { id: 'inn', name: 'Messages Test Inn', rooms: 5, color: 1 },
  ])
  const many = cal.calendarProperties(Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, rooms: [] })))
  assert.deepEqual(many.map((p) => p.color), [0, 1, 2, 3, 4, 0, 1])
})

test('cancelled bookings hold no room, and guests get short names', () => {
  const stays = cal.calendarStays([
    booking({ id: 'b', checkIn: '2026-12-05' }),
    booking({ id: 'x', stage: 'cancelled' }),
    booking({ id: 'a', guestName: 'Casey Lee', roomType: null }),
  ])
  assert.deepEqual(stays.map((s) => s.id), ['a', 'b'])
  assert.equal(stays[0].guest, 'Casey L.')
  assert.equal(stays[0].room, null)
})

test('a stay covers check-in up to, not including, check-out', () => {
  const stays = cal.calendarStays([booking()])
  assert.equal(cal.calendarDay('2026-12-03', stays, 8).booked, 0)
  const first = cal.calendarDay('2026-12-04', stays, 8)
  assert.equal(first.booked, 1)
  assert.equal(first.arrivals.length, 1)
  assert.equal(cal.calendarDay('2026-12-05', stays, 8).booked, 1)
  const out = cal.calendarDay('2026-12-06', stays, 8)
  assert.equal(out.booked, 0)
  assert.equal(out.departures.length, 1)
  assert.deepEqual(cal.dayGuests(out).map((s) => s.id), ['r1'])
})

test('busy levels and labels', () => {
  assert.equal(cal.busyLevel(0, 8), 0)
  assert.equal(cal.busyLevel(2, 8), 1)
  assert.equal(cal.busyLevel(3, 8), 2)
  assert.equal(cal.busyLevel(8, 8), 3)
  assert.equal(cal.busyLevel(9, 8), 3)
  assert.equal(cal.busyLevel(1, 0), 1)
  const stays = cal.calendarStays([booking({ id: 'a' }), booking({ id: 'b' })])
  const full = cal.calendarDay('2026-12-04', stays, 2)
  assert.equal(cal.bookedLabel(full), 'Full')
  assert.equal(cal.bookedPercent(full), 100)
  const some = cal.calendarDay('2026-12-04', stays, 8)
  assert.equal(cal.bookedLabel(some), '2 of 8')
  assert.equal(cal.bookedLabel(some, '/'), '2/8')
  assert.equal(cal.bookedLabel(full, '/'), 'Full')
  assert.equal(cal.bookedPercent(some), 25)
  assert.equal(cal.roomsBookedLabel(some), '2 of 8 rooms booked')
  assert.equal(cal.bookedPercent(cal.calendarDay('2026-12-04', [], 0)), 0)
})

test('one property filter keeps only its rooms and stays', () => {
  const props = cal.calendarProperties(listings)
  const stays = cal.calendarStays([booking({ id: 'a' }), booking({ id: 'b', hotelId: 'loft' })])
  const all = cal.forProperty(props, stays, null)
  assert.equal(all.stays.length, 2)
  const loft = cal.forProperty(props, stays, 'loft')
  assert.deepEqual(loft.properties.map((p) => p.id), ['loft'])
  assert.deepEqual(loft.stays.map((s) => s.id), ['b'])
})

test('the week: seven days named from today, and each day counts its reservations', () => {
  const stays = cal.calendarStays([
    booking({ id: 'a', checkIn: '2026-11-20', checkOut: '2026-11-22' }),
    booking({ id: 'b', checkIn: '2026-11-24', checkOut: '2026-11-30' }),
    booking({ id: 'c', checkIn: '2026-11-18', checkOut: '2026-11-20' }),
  ])
  const days = cal.calendarDays('2026-11-20', 7, stays, 2)
  assert.equal(days.length, 7)
  assert.equal(days[6].date, '2026-11-26')
  assert.equal(cal.dayName('2026-11-20', '2026-11-20'), 'Today')
  assert.equal(cal.dayName('2026-11-21', '2026-11-20'), 'Sat')
  // Nov 20: a arrives, c leaves that morning
  assert.equal(cal.reservationsLabel(days[0]), '2 reservations')
  assert.equal(cal.reservationsLabel(days[1]), '1 reservation')
  assert.equal(cal.reservationsLabel(days[3]), '0 reservations')
})

test('day panel notes and summary', () => {
  const [stay] = cal.calendarStays([booking()])
  assert.equal(cal.stayNote(stay, '2026-12-04'), 'Arrives today')
  assert.equal(cal.stayNote(stay, '2026-12-05'), 'Until Dec 6')
  assert.equal(cal.stayNote(stay, '2026-12-06'), 'Leaves today')
  const stays = cal.calendarStays([booking({ id: 'a' }), booking({ id: 'b' }), booking({ id: 'c', checkIn: '2026-12-01', checkOut: '2026-12-04' })])
  assert.equal(cal.movementSummary(cal.calendarDay('2026-12-04', stays, 8)), '2 arrivals, 1 guest leaving')
  assert.equal(cal.movementSummary(cal.calendarDay('2026-12-05', stays, 8)), 'No arrivals, nobody leaving')
  const [props] = [cal.calendarProperties(listings)]
  assert.equal(cal.stayPlace(stay, props[1]), 'Messages Test Inn · Standard king')
  assert.equal(cal.stayPlace({ ...stay, room: null }), 'Messages Test Inn')
})

test('month grid starts on Sunday with blanks before the 1st', () => {
  const cells = monthCells({ y: 2026, m: 11 })
  assert.equal(cells.length, 2 + 31)
  assert.deepEqual(cells.slice(0, 3), [null, null, '2026-12-01'])
  assert.equal(cells.at(-1), '2026-12-31')
  assert.equal(monthCells({ y: 2026, m: 1 }).filter(Boolean).length, 28)
  assert.equal(formatMonth({ y: 2026, m: 11 }), 'December 2026')
  assert.deepEqual(shiftMonth(monthOf('2026-12-15'), 1), { y: 2027, m: 0 })
  const grid = cal.monthGrid({ y: 2026, m: 11 }, cal.calendarStays([booking()]), 8)
  assert.equal(grid[0], null)
  assert.equal(grid[5].date, '2026-12-04')
  assert.equal(grid[5].booked, 1)
})

test('date param and calendar link', () => {
  assert.equal(cal.calendarDateParam('2026-12-04'), '2026-12-04')
  assert.equal(cal.calendarDateParam('2026-02-30'), null)
  assert.equal(cal.calendarDateParam('tomorrow'), null)
  assert.equal(cal.calendarDateParam(undefined), null)
  assert.equal(cal.calendarHref('2026-12-04'), '/listings?date=2026-12-04#calendar')
  assert.equal(cal.calendarHref(), '/listings#calendar')
})
