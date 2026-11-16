// QA 4.8.4 E2: the DB's two overlap guards get their own messages (checkout and booking changes)
import { test } from 'node:test'
import assert from 'node:assert/strict'
const { bookingConflictMessage } = await import('../utils/reservation-logic.ts')

test('the guest already holds another hotel on those nights', () => {
  assert.equal(
    bookingConflictMessage({ code: '23P01', message: 'conflicting key value violates exclusion constraint "reservations_no_account_overlap"' }),
    'You already have a booking at another hotel for overlapping dates.',
  )
})

test('the room is taken', () => {
  assert.equal(bookingConflictMessage({ code: '23P01', message: 'violates exclusion constraint "reservations_no_overlap"' }), 'Room is not available for those dates.')
  assert.equal(bookingConflictMessage({ code: '23P01' }), 'Room is not available for those dates.')
})

test('any other error is not a conflict', () => {
  for (const error of [null, undefined, {}, { code: '23505' }, { code: '23P011' }]) assert.equal(bookingConflictMessage(error), null)
})
