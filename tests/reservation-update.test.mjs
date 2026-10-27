// Unit tests for PATCH /api/reservations/[id]
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const EXCLUSION_VIOLATION = '23P01'

function getDateFromToday(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split('T')[0]
}

// Mock state to control behavior per test
let mockAuthUser = { id: 'user-1' }
let mockReservationResult = {
  data: { 
    id: 'res-1', 
    account_id: 'user-1',
    hotel_id: 'hotel-1',
    room_id: 'room-1', 
    check_in: getDateFromToday(2), 
    check_out: getDateFromToday(5), 
    total_price: 300,
    guests: 2, 
    children: 0,
    status: 'confirmed', 
  },
  error: null,
}
let mockRoomResult = {
  data: { id: 'room-1', hotel_id: 'hotel-1', price_per_night: 100, capacity: 2 },
  error: null,
}
let mockUpdateError = null
mock.module('../utils/user.ts', {
  namedExports: {
    getUserId: async () => ({
      supabase: {
        from: (table) => {
          if (table === 'rooms') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => mockRoomResult,
                }),
              }),
            }
          }
          return {}
        },
      },
      userId: mockAuthUser ? mockAuthUser.id : null,
    }),
  },
})

mock.module('../utils/reservations.ts', {
  namedExports: {
    getReservation: async (id) => mockReservationResult,
    updateReservation: async (id, payload) => {
      if (mockUpdateError) {
        return { data: null, error: mockUpdateError }
      }
      // Dynamically return the id combined with whatever payload was passed
      return {
        data: [{ id, ...payload }],
        error: null,
      }
    },
  },
})

const { PATCH } = await import('../app/api/reservations/[id]/route.ts')

beforeEach(() => {
  // Reset default successful mock states before each test
  mockAuthUser = { id: 'user-1' }
  mockReservationResult = {
    data: {
      id: 'res-1',
      account_id: 'user-1',
      hotel_id: 'hotel-1',
      room_id: 'room-1',
      check_in: getDateFromToday(2),
      check_out: getDateFromToday(5),
      total_price: 300,
      guests: 2,
      // Like the real table: a children column, no adults column
      children: 0,
      status: 'confirmed',
    },
    error: null,
  }
  mockRoomResult = {
    data: { id: 'room-1', hotel_id: 'hotel-1', price_per_night: 100, capacity: 2 },
    error: null,
  }
  mockUpdateError = null
})

function createMockRequest(body) {
  return new Request('http://localhost/api/reservations/res-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('returns 401 if user is not logged in', async () => {
  mockAuthUser = null
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to book.')
})

test('returns 404 if reservation does not exist', async () => {
  mockReservationResult = { data: null, error: { message: 'Not found' } }
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-999' }) })
  
  assert.equal(res.status, 404)
  const json = await res.json()
  assert.equal(json.error, 'Reservation not found. ')
})

test('returns 403 if reservation belongs to a different user', async () => {
  mockReservationResult.data.account_id = 'other-user';
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 403)
  const json = await res.json()
  assert.equal(json.error, 'Reservation change for another user is forbidden. ')
})

test('returns 422 if reservation is for past dates', async () => {
  mockReservationResult.data.check_in = getDateFromToday(0)
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 422)
  const json = await res.json()
  assert.equal(json.error, 'Reservation for past dates cannot be changed. ')
})

test('returns 400 on invalid JSON body', async () => {
  const req = new Request('http://localhost/api/reservations/res-1', {
    method: 'PATCH',
    body: 'invalid-json-string',
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'Invalid JSON body.')
})

test('returns 400 when reservation input validation fails', async () => {
  // Check-out before check-in (triggers validation error)
  const req = createMockRequest({ check_in: getDateFromToday(10), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error)
})

test('returns 404 if room is not found', async () => {
  mockRoomResult = { data: null, error: { message: 'Room not found' } }
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 404)
  const json = await res.json()
  assert.equal(json.error, 'Room not found.')
})

test('returns 400 if guest count exceeds room capacity', async () => {
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8), guests: 5 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error)
})

test('returns 409 on database exclusion-constraint violation (double booking)', async () => {
  mockUpdateError = { code: EXCLUSION_VIOLATION }
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 409)
  const json = await res.json()
  assert.equal(json.error, 'Room is not available for those dates.')
})

test('returns 500 on another database error', async () => {
  mockUpdateError = { code: EXCLUSION_VIOLATION + '1' }
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 500)
  const json = await res.json()
  assert.equal(json.error, 'Could not update reservation.')
})

test('successfully updates reservation and returns 200', async () => {
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(9) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.deepEqual(json.reservation, {
    id: 'res-1',
    hotel_id: 'hotel-1',
    room_id: 'room-1',
    check_in: getDateFromToday(5),
    check_out: getDateFromToday(9),
    total_price: 400,
    guests: 2,
    children: 0,
  })
})

// Audit R2: saved bookings have guests + children but no adults column
test('a dates-only change to a booking with a child keeps the party (no "guests must equal" error)', async () => {
  mockReservationResult.data.guests = 3
  mockReservationResult.data.children = 1
  mockRoomResult.data.capacity = 4
  const req = createMockRequest({ check_in: getDateFromToday(6), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.reservation.guests, 3)
  assert.equal(json.reservation.children, 1)
})

test('a room-only change keeps the party', async () => {
  mockReservationResult.data.guests = 1
  const req = createMockRequest({ room_id: 'room-2' })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.reservation.guests, 1)
  assert.equal(json.reservation.children, 0)
})

test('a guest count alone keeps the saved children while at least 1 adult is left', async () => {
  mockReservationResult.data.guests = 3
  mockReservationResult.data.children = 2
  mockRoomResult.data.capacity = 4
  let res = await PATCH(createMockRequest({ guests: 4 }), { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).reservation.children, 2)
  res = await PATCH(createMockRequest({ guests: 1 }), { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.reservation.guests, 1)
  assert.equal(json.reservation.children, 0)
})

test('room adult/child limits apply to edits even without a split', async () => {
  mockRoomResult.data = { id: 'room-1', hotel_id: 'hotel-1', price_per_night: 100, capacity: 4, max_adults: 1, max_children: 0 }
  const res = await PATCH(createMockRequest({ guests: 3 }), { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 400)
})

test('an invalid split is still rejected', async () => {
  const res = await PATCH(createMockRequest({ guests: 2, adults: 2, children: 1 }), { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 400)
})
// "Today" is the guest's today (from time_zone), not UTC's.
// 6pm Pacific on Oct 10 is already Oct 11 in UTC.
test('uses the guest time zone for "today": 6pm Pacific can still book from today', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
  mockReservationResult.data.check_in = '2026-10-11'
  mockReservationResult.data.check_out = '2026-10-13'

  const req = createMockRequest({
    time_zone: 'America/Los_Angeles',
    check_in: '2026-10-10',
    check_out: '2026-10-12',
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.reservation.check_in, '2026-10-10')
})

test('without a time zone, "today" falls back to UTC', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
  mockReservationResult.data.check_in = '2026-10-11'
  mockReservationResult.data.check_out = '2026-10-13'

  const req = createMockRequest({ check_in: '2026-10-10', check_out: '2026-10-12' })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  // Oct 11 is "today" in UTC, so the reservation counts as already started
  assert.equal(res.status, 422)
})

test('an invalid time zone falls back to UTC instead of erroring', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-11T01:00:00Z') })
  const req = createMockRequest({
    time_zone: 'Not/AZone',
    check_in: '2026-10-10',
    check_out: '2026-10-12',
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  // check_in Oct 10 is in the past in UTC
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(json.error, 'check_in cannot be in the past.')
})

// Audit F7: a cancelled booking can't be edited (it would rewrite history without reactivating it)
test('returns 409 and changes nothing for a cancelled reservation', async () => {
  mockReservationResult.data.status = 'cancelled'
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 409)
  const json = await res.json()
  assert.equal(json.error, 'Only confirmed reservations can be changed.')
})
