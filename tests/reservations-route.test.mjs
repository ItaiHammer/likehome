// QA 5.1.5 (from #196): /api/reservations no longer creates bookings. The old POST saved a
// confirmed booking with no payment; new bookings only go through /api/checkout.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

mock.module('../utils/user.ts', { namedExports: { getUserId: async () => ({ supabase: {}, userId: 'user-1' }) } })
mock.module('../utils/reservations.ts', {
  namedExports: { getReservationsByAccount: async () => ({ data: [{ id: 'res-1' }], error: null }) },
})

const route = await import('../app/api/reservations/route.ts')

test('there is no POST, so a booking cannot be created without paying', () => {
  assert.equal(route.POST, undefined)
})

test('GET still lists the signed-in guest\'s reservations', async () => {
  const res = await route.GET()
  assert.equal(res.status, 200)
  assert.deepEqual((await res.json()).reservations, [{ id: 'res-1' }])
})
