// US1.1.5 — saved cards: checkout and My Bookings › Account must call the same API route
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const SCREENS = ['app/reserve/[slug]/StayReservation.tsx', 'app/MyBookings/_components/AccountTabContent.tsx']

test('every saved-card fetch on both screens uses /api/saved-payment', () => {
  for (const file of SCREENS) {
    const routes = [...read(file).matchAll(/fetch\(\s*["'`](\/api\/saved-payment[^"'`?]*)/g)].map((m) => m[1])
    assert.ok(routes.length > 0, `${file} loads saved cards`)
    assert.deepEqual([...new Set(routes)], ['/api/saved-payment'], file)
  }
})

test('checkout books a free unit whether the guest pays with a new or a saved card', () => {
  const src = read('app/reserve/[slug]/StayReservation.tsx')
  assert.match(src, /const roomId = freeUnitId\(room, checkIn, checkOut\) \?\? room\.id;/)
  assert.doesNotMatch(src, /roomId:\s*room\.id/)
})
