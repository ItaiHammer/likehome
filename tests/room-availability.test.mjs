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
