// Unit tests for PATCH /api/reservations/[id]
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const EXCLUSION_VIOLATION = '23P01'

function getFutureDate(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split('T')[0]
}

// Mock state to control behavior per test
let mockAuthUser = { id: 'user-1' }
let mockReservationResult = {
  data: { id: 'res-1', account_id: 'user-1', room_id: 'room-1', check_in: getFutureDate(2), check_out: getFutureDate(5), status: 'confirmed' },
  error: null,
}
let mockRoomResult = {
  data: { id: 'room-1', hotel_id: 'hotel-1', price_per_night: 100, capacity: 2 },
  error: null,
}
let mockUpdateResult = {
  data: [{ id: 'res-1', check_in: getFutureDate(5), check_out: getFutureDate(8), total_price: 300 }],
  error: null,
}

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
    updateReservation: async (id, payload) => mockUpdateResult,
  },
})

const { PATCH } = await import('../app/api/reservations/[id]/route.ts')

beforeEach(() => {
  // Reset default successful mock states before each test
  mockAuthUser = { id: 'user-1' }
  mockReservationResult = {
    data: { id: 'res-1', account_id: 'user-1', room_id: 'room-1', check_in: getFutureDate(2), check_out: getFutureDate(5) },
    error: null,
  }
  mockRoomResult = {
    data: { id: 'room-1', hotel_id: 'hotel-1', price_per_night: 100, capacity: 2 },
    error: null,
  }
  mockUpdateResult = {
    data: [{ id: 'res-1', check_in: getFutureDate(5), check_out: getFutureDate(8), total_price: 300 }],
    error: null,
  }
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
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'You must be logged in to book.')
})

test('returns 404 if reservation does not exist', async () => {
  mockReservationResult = { data: null, error: { message: 'Not found' } }
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-999' }) })
  
  assert.equal(res.status, 404)
  const json = await res.json()
  assert.equal(json.error, 'Reservation not found. ')
})

test('returns 403 if reservation belongs to a different user', async () => {
  mockReservationResult = {
    data: { id: 'res-1', account_id: 'other-user', room_id: 'room-1', check_in: getFutureDate(2), check_out: getFutureDate(5) },
    error: null,
  }
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 403)
  const json = await res.json()
  assert.equal(json.error, 'Reservation change is forbidden. ')
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
  const req = createMockRequest({ check_in: getFutureDate(10), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error)
})

test('returns 404 if room is not found', async () => {
  mockRoomResult = { data: null, error: { message: 'Room not found' } }
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 404)
  const json = await res.json()
  assert.equal(json.error, 'Room not found.')
})

test('returns 400 if guest count exceeds room capacity', async () => {
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8), guests: 5 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(json.error)
})

test('returns 409 on database exclusion-constraint violation (double booking)', async () => {
  mockUpdateResult = { data: null, error: { code: EXCLUSION_VIOLATION } }
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 409)
  const json = await res.json()
  assert.equal(json.error, 'Room is not available for those dates.')
})

test('returns 500 on another database error', async () => {
  mockUpdateResult = { data: null, error: { code: EXCLUSION_VIOLATION + '1' } }
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 500)
  const json = await res.json()
  assert.equal(json.error, 'Could not update reservation.')
})

test('successfully updates reservation and returns 200', async () => {
  const req = createMockRequest({ check_in: getFutureDate(5), check_out: getFutureDate(8), guests: 2 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.ok(json.reservation)
  assert.equal(json.reservation.id, 'res-1')
})