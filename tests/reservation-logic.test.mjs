// Unit tests for utils/reservation-logic.ts — run with `npm test`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateTotalPrice,
  checkCapacity,
  countNights,
  datesOverlap,
  parseDate,
  validateReservationInput,
} from '../utils/reservation-logic.ts'

const TODAY = '2026-10-01'
const valid = { room_id: 'room-1', check_in: '2026-10-05', check_out: '2026-10-08', guests: 2 }

test('valid input passes', () => {
  const r = validateReservationInput(valid, TODAY)
  assert.equal(r.ok, true)
})

test('booking for today is allowed', () => {
  const r = validateReservationInput({ ...valid, check_in: TODAY, check_out: '2026-10-02' }, TODAY)
  assert.equal(r.ok, true)
})

test('rejects missing room_id', () => {
  const r = validateReservationInput({ ...valid, room_id: '' }, TODAY)
  assert.equal(r.ok, false)
})

test('rejects non-object body', () => {
  assert.equal(validateReservationInput(null, TODAY).ok, false)
  assert.equal(validateReservationInput('hi', TODAY).ok, false)
})

test('rejects bad date formats and impossible dates', () => {
  assert.equal(validateReservationInput({ ...valid, check_in: '10/05/2026' }, TODAY).ok, false)
  assert.equal(validateReservationInput({ ...valid, check_in: '2026-02-30' }, TODAY).ok, false)
  assert.equal(parseDate('2026-13-01'), null)
})

test('rejects check-in in the past', () => {
  const r = validateReservationInput({ ...valid, check_in: '2026-09-30' }, TODAY)
  assert.equal(r.ok, false)
})

test('rejects check-out before or equal to check-in', () => {
  assert.equal(validateReservationInput({ ...valid, check_out: '2026-10-04' }, TODAY).ok, false)
  assert.equal(validateReservationInput({ ...valid, check_out: '2026-10-05' }, TODAY).ok, false)
})

test('rejects stays over 30 nights', () => {
  const r = validateReservationInput({ ...valid, check_out: '2026-11-05' }, TODAY)
  assert.equal(r.ok, false)
})

test('rejects bad guest counts', () => {
  for (const guests of [0, -1, 1.5, '2']) {
    assert.equal(validateReservationInput({ ...valid, guests }, TODAY).ok, false, `guests=${guests}`)
  }
})

test('guests is optional', () => {
  const noGuests = { ...valid }
  delete noGuests.guests
  assert.equal(validateReservationInput(noGuests, TODAY).ok, true)
})

test('counts nights, including across month/DST boundaries', () => {
  assert.equal(countNights('2026-10-05', '2026-10-08'), 3)
  assert.equal(countNights('2026-10-30', '2026-11-02'), 3)
  assert.equal(countNights('2026-03-07', '2026-03-09'), 2)
})

test('calculates total price rounded to cents', () => {
  assert.equal(calculateTotalPrice('2026-10-05', '2026-10-08', 129.99), 389.97)
  assert.equal(calculateTotalPrice('2026-10-05', '2026-10-06', '100.00'), 100)
})

test('overlap detection', () => {
  assert.equal(datesOverlap('2026-10-05', '2026-10-08', '2026-10-07', '2026-10-10'), true)
  assert.equal(datesOverlap('2026-10-05', '2026-10-08', '2026-10-01', '2026-10-20'), true)
  // back-to-back is fine
  assert.equal(datesOverlap('2026-10-05', '2026-10-08', '2026-10-08', '2026-10-10'), false)
  assert.equal(datesOverlap('2026-10-05', '2026-10-08', '2026-10-01', '2026-10-05'), false)
})

test('capacity check', () => {
  const room = { id: 'r', hotel_id: 'h', price_per_night: 100, capacity: 2 }
  assert.equal(checkCapacity(2, room), null)
  assert.notEqual(checkCapacity(3, room), null)
  assert.equal(checkCapacity(undefined, room), null)
})
