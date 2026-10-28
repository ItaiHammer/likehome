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

// Retest: stays after the first ~400-day lookup are checked for their own dates
test('dates outside the looked-up window need their own lookup', async () => {
  const { outsideWindow } = await import('../lib/room-availability.ts')
  const w = { from: '2026-10-26', to: '2027-11-30' }
  assert.equal(outsideWindow(w, '2027-01-10', '2027-01-12'), false)
  assert.equal(outsideWindow(w, '2027-11-28', '2027-11-30'), false) // check-out on the last day is inside
  assert.equal(outsideWindow(w, '2027-11-29', '2027-12-02'), true)
  assert.equal(outsideWindow(w, '2028-03-01', '2028-03-05'), true)
  assert.equal(outsideWindow(undefined, '2028-03-01', '2028-03-05'), false) // sample stays
  assert.equal(outsideWindow(w, '', ''), false)
})

test('nights looked up later are added to the right rooms, so a room booked then shows as booked', async () => {
  const { markBookedRooms, mergeBookedNights } = await import('../lib/room-availability.ts')
  const rooms = [
    { id: 'a', units: [{ id: 'a', bookedNights: ['2027-01-01'] }] },
    { id: 'b', units: [{ id: 'b', bookedNights: [] }] },
  ]
  const merged = mergeBookedNights(rooms, [{ room_id: 'a', night: '2028-03-01' }, { room_id: 'a', night: '2027-01-01' }])
  assert.deepEqual(merged[0].units[0].bookedNights, ['2027-01-01', '2028-03-01'])
  assert.deepEqual(merged[1], rooms[1])
  const dated = markBookedRooms(merged, '2028-03-01', '2028-03-03')
  assert.equal(dated[0].bookedForDates, true)
  assert.notEqual(dated[1].soldOut, true)
  assert.equal(mergeBookedNights(rooms, []), rooms)
})

// Retest: switching rooms on a booking
test('a booking being changed: its own room is free for its own nights, other guests\' rooms are not', async () => {
  const { cardsForBooking, freeUnitId, markBookedRooms, withoutStay } = await import('../lib/room-availability.ts')
  // Rooms A and B booked for the same dates; this booking holds B
  const rooms = [
    { id: 'A', units: [{ id: 'A', bookedNights: ['2027-05-01', '2027-05-02'] }] },
    { id: 'B1', units: [{ id: 'B1', bookedNights: [] }, { id: 'B2', bookedNights: ['2027-05-01', '2027-05-02'] }] },
  ]
  const cards = withoutStay(cardsForBooking(rooms, 'B2'), 'B2', '2027-05-01', '2027-05-03')
  assert.equal(cards[1].id, 'B2') // the card is named by the booked room
  assert.deepEqual(cards[1].units.map((u) => u.id), ['B2', 'B1'])
  const dated = markBookedRooms(cards, '2027-05-01', '2027-05-03')
  assert.equal(dated[0].bookedForDates, true) // A shows as unavailable
  assert.notEqual(dated[1].soldOut, true)
  assert.equal(freeUnitId(dated[1], '2027-05-01', '2027-05-03'), 'B2') // keeps its own room
})

test('a live quote\'s rooms count the booking\'s own nights again; taking them off again keeps the room', async () => {
  const { freeUnitId, markBookedRooms, withoutStay } = await import('../lib/room-availability.ts')
  // A LiteAPI room is its own card. The prices route sends fresh units, which still hold this booking (May 1-3).
  const quoted = [{ id: 'L1', units: [{ id: 'L1', bookedNights: ['2027-05-01', '2027-05-02'] }] }]
  assert.equal(markBookedRooms(quoted, '2027-05-01', '2027-05-04')[0].bookedForDates, true)
  const mine = withoutStay(quoted, 'L1', '2027-05-01', '2027-05-03')
  const dated = markBookedRooms(mine, '2027-05-01', '2027-05-04') // one night longer
  assert.notEqual(dated[0].soldOut, true)
  assert.equal(freeUnitId(dated[0], '2027-05-01', '2027-05-04'), 'L1')
  assert.deepEqual(withoutStay(mine, 'L1', '2027-05-01', '2027-05-03'), mine) // running it twice changes nothing
})

test('photos removed by a save: only the owner\'s uploaded files are deleted', async () => {
  const { removedPhotoPaths } = await import('../lib/listing-photos.ts')
  const base = 'https://x.supabase.co/storage/v1/object/public/listing-photos/'
  const before = [`${base}u1/a.jpg`, `${base}u1/b.png`, '/listings/samples/exterior.svg', `${base}u2/c.jpg`, 'https://elsewhere.com/d.jpg']
  const after = [`${base}u1/b.png`]
  assert.deepEqual(removedPhotoPaths(before, after, 'u1'), ['u1/a.jpg'])
  assert.deepEqual(removedPhotoPaths(before, before, 'u1'), [])
  assert.deepEqual(removedPhotoPaths([`${base}u1/../u2/x.jpg`], [], 'u1'), [])
})
