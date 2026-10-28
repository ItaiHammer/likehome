// Audit F1: saving a listing updates rooms in place instead of deleting them (and their bookings)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupRoomRows, hasRoomChanges, parseBedConfiguration, planRoomChanges } from '../lib/listing-rooms.ts'

const row = (id, over = {}) => ({
  id,
  hotel_id: 'h1',
  room_type: 'Coastal king',
  price_per_night: '189.00',
  capacity: 2,
  num_beds: 1,
  bed_size: 'King',
  tags: [],
  created_at: `2026-01-0${id.slice(-1)}T00:00:00Z`,
  ...over,
})

const kings = [row('r1'), row('r2'), row('r3')]
const twin = row('t1', { room_type: 'Twin', price_per_night: '99', num_beds: 2, bed_size: 'Twin' })

const draftOf = (rows) => groupRoomRows(rows).map((g) => g.room)

test('identical rows load as one room type, named by its first row', () => {
  const groups = groupRoomRows([...kings, twin])
  assert.equal(groups.length, 2)
  assert.equal(groups[0].room.id, 'r1')
  assert.equal(groups[0].room.roomCount, 3)
  assert.deepEqual(groups[0].ids, ['r1', 'r2', 'r3'])
  assert.equal(groups[0].room.bedConfiguration, '1 king bed')
  assert.equal(groups[0].room.nightlyRateCents, 18900)
})

test('saving without changes touches nothing', () => {
  const rows = [...kings, twin]
  assert.equal(hasRoomChanges(planRoomChanges(rows, draftOf(rows))), false)
})

test('editing a room type updates its rows in place (same ids, so bookings stay)', () => {
  const draft = draftOf(kings)
  draft[0] = { ...draft[0], nightlyRateCents: 19900, roomType: 'Ocean king' }
  const plan = planRoomChanges(kings, draft)
  assert.deepEqual(plan.remove, [])
  assert.deepEqual(plan.insert, [])
  assert.equal(plan.update.length, 1)
  assert.deepEqual(plan.update[0].ids, ['r1', 'r2', 'r3'])
  assert.equal(plan.update[0].price_per_night, 199)
  assert.equal(plan.update[0].room_type, 'Ocean king')
})

test('more rooms of a type adds only the difference', () => {
  const draft = draftOf(kings)
  draft[0] = { ...draft[0], roomCount: 5 }
  const plan = planRoomChanges(kings, draft)
  assert.equal(plan.insert.length, 2)
  assert.deepEqual(plan.update, [])
  assert.deepEqual(plan.remove, [])
})

test('fewer rooms of a type removes only the difference, letting the database pick unbooked ones', () => {
  const draft = draftOf(kings)
  draft[0] = { ...draft[0], roomCount: 1 }
  const plan = planRoomChanges(kings, draft)
  assert.deepEqual(plan.remove, [{ ids: ['r1', 'r2', 'r3'], count: 2, room_type: 'Coastal king' }])
  assert.deepEqual(plan.insert, [])
})

test('a deleted room type is removed entirely; a new one is inserted', () => {
  const rows = [...kings, twin]
  const draft = draftOf(rows).filter((r) => r.id !== 't1')
  draft.push({ id: 'b8a4c9f2-0000-4000-8000-000000000000', roomType: 'Suite', bedConfiguration: '2 queen beds', maxGuests: 4, roomCount: 2, nightlyRateCents: 30000, description: '' })
  const plan = planRoomChanges(rows, draft)
  assert.deepEqual(plan.remove, [{ ids: ['t1'], count: 1, room_type: 'Twin' }])
  assert.equal(plan.insert.length, 2)
  assert.deepEqual(plan.insert[0], { room_type: 'Suite', price_per_night: 300, capacity: 4, num_beds: 2, bed_size: 'Queen' })
})

test('a duplicated id in the draft is treated as a new room, never as a second edit of the same rows', () => {
  const draft = draftOf(kings)
  const plan = planRoomChanges(kings, [draft[0], { ...draft[0], roomCount: 1 }])
  assert.equal(plan.insert.length, 1)
  assert.deepEqual(plan.remove, [])
})

test('bed configurations are read the way the editor writes them', () => {
  assert.deepEqual(parseBedConfiguration('2 Twin XL beds'), { num_beds: 2, bed_size: 'Twin XL' })
  assert.deepEqual(parseBedConfiguration('1 king bed'), { num_beds: 1, bed_size: 'King' })
  assert.deepEqual(parseBedConfiguration('a big bed'), { num_beds: 1, bed_size: null })
})
