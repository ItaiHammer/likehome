import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rebookHref } from '../lib/rebook.ts'

test('builds the pre-filled checkout link', () => {
  assert.equal(
    rebookHref({ hotelId: 'hotel-1', roomId: 'room-1', checkIn: '2026-11-10', checkOut: '2026-11-13', guests: 3 }),
    '/reserve/hotel-1?room=room-1&checkIn=2026-11-10&checkOut=2026-11-13&adults=3&children=0',
  )
})

test('keeps adults within what the reserve page accepts', () => {
  const href = (guests) => rebookHref({ hotelId: 'h', roomId: 'r', checkIn: '2026-11-10', checkOut: '2026-11-11', guests })
  assert.match(href(0), /adults=1&/)
  assert.match(href(40), /adults=16&/)
})
