// Audit F9 (stay page picks a room that's free for the dates) and F3 (photo upload rules)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freeUnitId, nightsByRoom, soldOutNights } from '../lib/room-availability.ts'
import { photoProblem } from '../lib/listing-photos.ts'

const king = {
  id: 'k1',
  units: [
    { id: 'k1', bookedNights: ['2026-11-10', '2026-11-11'] },
    { id: 'k2', bookedNights: ['2026-11-11'] },
  ],
}

test('booking picks the first identical room free every night of the stay', () => {
  assert.equal(freeUnitId(king, '2026-11-01', '2026-11-03'), 'k1')
  assert.equal(freeUnitId(king, '2026-11-10', '2026-11-11'), 'k2')
  assert.equal(freeUnitId(king, '2026-11-11', '2026-11-12'), null)
})

test('the check-out day is free for the next guest', () => {
  assert.equal(freeUnitId(king, '2026-11-08', '2026-11-10'), 'k1')
  assert.equal(freeUnitId(king, '2026-11-12', '2026-11-14'), 'k1')
})

test('rooms without unit details (sample stays) and missing dates keep their own id', () => {
  assert.equal(freeUnitId({ id: 'villa' }, '2026-11-10', '2026-11-12'), 'villa')
  assert.equal(freeUnitId(king, '', ''), 'k1')
})

test('the calendar only crosses out nights when every room is booked', () => {
  const twin = { id: 't1', units: [{ id: 't1', bookedNights: ['2026-11-11', '2026-11-20'] }] }
  assert.deepEqual(soldOutNights([king, twin]), ['2026-11-11'])
  assert.deepEqual(soldOutNights([king, { id: 'x' }]), [])
  assert.deepEqual(soldOutNights([]), [])
})

test('booked-night rows are grouped per room', () => {
  const map = nightsByRoom([
    { room_id: 'a', night: '2026-11-10' },
    { room_id: 'a', night: '2026-11-11T00:00:00' },
    { room_id: 'b', night: '2026-11-10' },
  ])
  assert.deepEqual(map.get('a'), ['2026-11-10', '2026-11-11'])
  assert.deepEqual(map.get('b'), ['2026-11-10'])
})

test('photos must be an accepted image type and at most 5 MB', () => {
  assert.equal(photoProblem({ type: 'image/jpeg', size: 1_000_000 }), null)
  assert.match(photoProblem({ type: 'image/svg+xml', size: 10 }), /Only JPG/)
  assert.match(photoProblem({ type: 'application/pdf', size: 10 }), /Only JPG/)
  assert.match(photoProblem({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/)
})

// Audit R5: the room picked for a stay must be free for its dates
test('the cheapest room booked for the dates is skipped; a free one is picked', async () => {
  const { markBookedRooms } = await import('../lib/room-availability.ts')
  const { matchingRoom } = await import('../lib/stay-filters.ts')
  const rooms = [
    { id: 'cheap', nightly: 101, sleeps: 2, units: [{ id: 'cheap', bookedNights: ['2027-04-10', '2027-04-11'] }] },
    { id: 'pricey', nightly: 202, sleeps: 2, units: [{ id: 'pricey', bookedNights: [] }] },
  ]
  const dated = markBookedRooms(rooms, '2027-04-10', '2027-04-12')
  assert.equal(dated[0].soldOut, true)
  assert.equal(dated[0].bookedForDates, true)
  assert.equal(matchingRoom(dated, [], { guests: 1, tags: [] }).id, 'pricey')
  // Other dates: the cheap room is open again
  assert.equal(matchingRoom(markBookedRooms(rooms, '2027-04-12', '2027-04-14'), [], { guests: 1, tags: [] }).id, 'cheap')
  // Every room booked: nothing is offered as bookable
  const allBooked = markBookedRooms([rooms[0]], '2027-04-10', '2027-04-12')
  assert.equal(matchingRoom(allBooked, [], { guests: 1, tags: [] }), null)
  // A sample room already sold out stays as it was
  assert.deepEqual(markBookedRooms([{ id: 'v', soldOut: true }], '2027-04-10', '2027-04-12'), [{ id: 'v', soldOut: true }])
})
