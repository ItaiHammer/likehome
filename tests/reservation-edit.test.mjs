// Unit tests for PATCH /api/reservations/[id]
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const EXCLUSION_VIOLATION = '23P01'

function getDateFromToday(daysFromToday) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysFromToday)
  return d.toISOString().split('T')[0]
}

// Mock state to control behavior per test
let mockAuthUser
let mockReservationResult
let mockRoomResult
let mockEditResult
let mockEditCalls

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
    getReservation: async () => mockReservationResult,
    editReservation: async (id, updates, options) => {
      mockEditCalls.push({ id, updates, options })
      return mockEditResult
    },
  },
})

const { PATCH } = await import('../app/api/reservations/[id]/route.ts')

beforeEach((t) => {
  // Keep date-dependent tests deterministic.
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-10-11T01:00:00Z'),
  })

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
      status: 'confirmed',
    },
    error: null,
  }
  mockRoomResult = {
    data: {
      id: 'room-1',
      hotel_id: 'hotel-1',
      price_per_night: 100,
      capacity: 2,
    },
    error: null,
  }

  // SQL supplies the updated reservation and calculated price.
  mockEditResult = {
    data: [{
      ...mockReservationResult.data,
      check_out: getDateFromToday(6),
      total_price: 400,
    }],
    error: null,
  }
  mockEditCalls = []
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
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 401)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 404 if reservation does not exist', async () => {
  mockReservationResult = {
    data: null,
    error: { message: 'Not found' },
  }
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-999' }),
  })

  assert.equal(res.status, 404)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 403 if reservation belongs to a different user', async () => {
  mockReservationResult.data.account_id = 'other-user'
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 403)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 422 if reservation is not confirmed', async () => {
  mockReservationResult.data.status = 'cancelled'
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 422)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 422 if existing check-in is today or earlier', async () => {
  mockReservationResult.data.check_in = getDateFromToday(0)
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 422)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 400 on invalid JSON body', async () => {
  const req = new Request('http://localhost/api/reservations/res-1', {
    method: 'PATCH',
    body: 'invalid-json-string',
  })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 400)
  const json = await res.json()
  assert.equal(mockEditCalls.length, 0)
})

test('returns 400 when the JSON body is not an object', async () => {
  for (const body of [null, [], 'hello']) {
    const req = createMockRequest(body)
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'res-1' }),
    })

    assert.equal(res.status, 400)
  }
  assert.equal(mockEditCalls.length, 0)
})

test('returns 400 when reservation input validation fails', async () => {
  // Check-out before check-in.
  const req = createMockRequest({
    check_in: getDateFromToday(10),
    check_out: getDateFromToday(8),
  })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 400)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 404 if room is not found', async () => {
  mockRoomResult = {
    data: null,
    error: { message: 'Room not found' },
  }
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 404)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 400 if guest count exceeds room capacity', async () => {
  const req = createMockRequest({ guests: 5 })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 400)
  assert.equal(mockEditCalls.length, 0)
})

test('returns 400 for an invalid payment method', async () => {
  for (const payment_method of ['cash', null]) {
    const req = createMockRequest({ payment_method })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'res-1' }),
    })

    assert.equal(res.status, 400)
  }
  assert.equal(mockEditCalls.length, 0)
})

test('passes an explicit card or points selection to editReservation', async () => {
  for (const payment_method of ['card', 'points']) {
    const req = createMockRequest({
      check_out: getDateFromToday(6),
      payment_method,
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'res-1' }),
    })

    assert.equal(res.status, 200)
    const call = mockEditCalls[mockEditCalls.length - 1]
    assert.equal(call.options.payment_method, payment_method)
  }
  assert.equal(mockEditCalls.length, 2)
})

test('successfully edits a partial request using the original snapshot', async () => {
  const req = createMockRequest({
    check_out: getDateFromToday(6),

    // These must not control pricing, ownership, status or the snapshot.
    total_price: 1,
    hotel_id: 'fake-hotel',
    account_id: 'other-user',
    status: 'cancelled',
    expected: { total_price: 1 },
  })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 200)

  // Omitted booking fields are preserved. Omitted payment method uses card.
  assert.deepEqual(mockEditCalls, [{
    id: 'res-1',
    updates: {
      room_id: 'room-1',
      guests: 2,
      check_in: getDateFromToday(2),
      check_out: getDateFromToday(6),
    },
    options: {
      payment_method: 'card',
      time_zone: null,
      expected: {
        room_id: 'room-1',
        check_in: getDateFromToday(2),
        check_out: getDateFromToday(5),
        guests: 2,
        total_price: 300,
      },
    },
  }])

  // Return the database result, including its calculated price.
  const json = await res.json()
  assert.deepEqual(json.reservation, mockEditResult.data[0])
})

test('returns 409 on database exclusion-constraint violation', async () => {
  mockEditResult = {
    data: null,
    error: { code: EXCLUSION_VIOLATION },
  }
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 409)
  const json = await res.json()
  assert.equal(json.error, 'Room is not available for those dates.')
})

test('maps edit errors to the appropriate HTTP status and message', async () => {
  const cases = [
    ['PT400', 400, 'Business error'],
    ['PT401', 401, 'Business error'],
    ['PT402', 402, 'Business error'],
    ['PT404', 404, 'Business error'],
    ['PT409', 409, 'Business error'],
    ['PT422', 422, 'Business error'],
  ]

  for (const [code, status, message] of cases) {
    mockEditResult = {
      data: null,
      error: { code, message },
    }
    const req = createMockRequest({ check_out: getDateFromToday(6) })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'res-1' }),
    })

    assert.equal(res.status, status, code)
    const json = await res.json()
    assert.equal(json.error, message, code)
  }
})

test('returns 500 on an unexpected database error', async () => {
  mockEditResult = {
    data: null,
    error: { code: 'XX000', message: 'Internal database details' },
  }
  const req = createMockRequest({ check_out: getDateFromToday(6) })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 500)
  const json = await res.json()
  assert.equal(json.error, 'Could not update reservation.')
})

test('returns 500 if editReservation returns no reservation', async () => {
  for (const data of [null, []]) {
    mockEditResult = { data, error: null }
    const req = createMockRequest({ check_out: getDateFromToday(6) })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'res-1' }),
    })

    assert.equal(res.status, 500)
    const json = await res.json()
    assert.equal(json.error, 'Could not update reservation.')
  }
})

// At the fixed test time, it is Oct 10 in Los Angeles but Oct 11 in UTC.
test('uses the guest time zone for eligibility and requested dates', async () => {
  mockReservationResult.data.check_in = '2026-10-11'
  mockReservationResult.data.check_out = '2026-10-13'

  const req = createMockRequest({
    time_zone: 'America/Los_Angeles',
    check_in: '2026-10-10',
    check_out: '2026-10-12',
  })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 200)
  assert.equal(mockEditCalls.length, 1)
  assert.equal(mockEditCalls[0].updates.check_in, '2026-10-10')
  assert.equal(mockEditCalls[0].options.time_zone, 'America/Los_Angeles')
})

test('without a time zone, today falls back to UTC', async () => {
  mockReservationResult.data.check_in = '2026-10-11'
  mockReservationResult.data.check_out = '2026-10-13'

  const req = createMockRequest({
    check_in: '2026-10-10',
    check_out: '2026-10-12',
  })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  // Existing check-in is already today in UTC.
  assert.equal(res.status, 422)
  assert.equal(mockEditCalls.length, 0)
})

test('an invalid time zone falls back to UTC instead of erroring', async () => {
  const req = createMockRequest({
    time_zone: 'Not/AZone',
    check_in: '2026-10-11',
    check_out: '2026-10-12',
  })
  const res = await PATCH(req, {
    params: Promise.resolve({ id: 'res-1' }),
  })

  assert.equal(res.status, 200)
  assert.equal(mockEditCalls.length, 1)
})

test('editing becomes unavailable at guest-local midnight', async (t) => {
  mockReservationResult.data.check_in = '2026-10-11'
  mockReservationResult.data.check_out = '2026-10-13'

  t.mock.timers.setTime(Date.parse('2026-10-11T06:59:59Z'))
  const beforeMidnight = await PATCH(
    createMockRequest({ time_zone: 'America/Los_Angeles' }),
    { params: Promise.resolve({ id: 'res-1' }) }
  )
  assert.equal(beforeMidnight.status, 200)
  assert.equal(mockEditCalls.length, 1)

  mockEditCalls = []
  t.mock.timers.setTime(Date.parse('2026-10-11T07:00:00Z'))
  const atMidnight = await PATCH(
    createMockRequest({ time_zone: 'America/Los_Angeles' }),
    { params: Promise.resolve({ id: 'res-1' }) }
  )
  assert.equal(atMidnight.status, 422)
  assert.equal(mockEditCalls.length, 0)
})