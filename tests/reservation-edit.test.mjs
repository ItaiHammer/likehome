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
      return mockEditResult ??
      {
        data: [{
          ...mockReservationResult.data,
          ...updates
        }],
        error: null,
      }
    },
  },
})

const liveRoomPrice = mock.fn(async () => ({ status: 'unavailable' }))
mock.module('../lib/liteapi/rates.ts', { namedExports: { liveRoomPrice } })

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

  mockEditResult = null
  mockEditCalls = []
  
  liveRoomPrice.mock.resetCalls()
  liveRoomPrice.mock.mockImplementation(async () => ({ status: 'unavailable' }))
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
  assert.equal(liveRoomPrice.mock.callCount(), 0)
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
  assert.equal(liveRoomPrice.mock.callCount(), 0)

  // Omitted booking fields are preserved. Omitted payment method uses card.
  assert.deepEqual(mockEditCalls, [{
    id: 'res-1',
    updates: {
      room_id: 'room-1',
      guests: 2,
      adults: 2,
      children: 0,
      check_in: getDateFromToday(2),
      check_out: getDateFromToday(6),
      total_price: 400
    },
    options: {
      payment_method: 'card',
      time_zone: null,
      expected: {
        room_id: 'room-1',
        check_in: getDateFromToday(2),
        check_out: getDateFromToday(5),
        guests: 2,
        children: null,
        total_price: 300,
      },
    },
  }])

  // Return the database result, including its calculated price.
  const json = await res.json()
  assert.deepEqual(json.reservation, {
      id: 'res-1',
      account_id: 'user-1',
      hotel_id: 'hotel-1',
      room_id: 'room-1',
      guests: 2,
      adults: 2,
      children: 0,
      check_in: getDateFromToday(2),
      check_out: getDateFromToday(6),
      total_price: 400,
      status: 'confirmed'
    })
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
  assert.equal(liveRoomPrice.mock.callCount(), 0)
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
  assert.equal(liveRoomPrice.mock.callCount(), 0)
  assert.equal(mockEditCalls.length, 1)
})

test('editing becomes unavailable at guest-local midnight', async (t) => {
  mockReservationResult.data.check_in = '2026-10-11'
  mockReservationResult.data.check_out = '2026-10-13'

  t.mock.timers.setTime(Date.parse('2026-10-11T06:59:59Z'))
  // Must try to change reservation to skip unchanged early return
  const beforeMidnight = await PATCH(
    createMockRequest({ time_zone: 'America/Los_Angeles', guests: 1 }),
    { params: Promise.resolve({ id: 'res-1' }) }
  )
  assert.equal(beforeMidnight.status, 200)
  assert.equal(liveRoomPrice.mock.callCount(), 0)
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

// Rooms at hotels imported from LiteAPI are repriced at the live rate when the stay changes
const LITE_ROOM = {
  id: 'room-1',
  hotel_id: 'hotel-1',
  price_per_night: 120,
  capacity: 2,
  room_type: 'Standard King Room',
  liteapi_room_id: '2617267',
  hotels: { liteapi_id: 'lp1897' },
}
const liveQuote = (total, nights) => ({
  status: 'live',
  value: { total, perNight: total / nights, offerId: 'offer-1', rateName: 'Standard King Room', boardType: 'RO', refundable: true, dueAtProperty: 0 },
})

test('LiteAPI room with new dates is repriced at the live rate', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(487.31, 4))
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(9) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.reservation.total_price, 487.31)
  assert.equal(mockEditCalls[0].id, 'res-1')
  assert.equal(mockEditCalls[0].updates.total_price, 487.31)
  assert.deepEqual(liveRoomPrice.mock.calls[0].arguments, [
    { liteapiHotelId: 'lp1897', liteapiRoomId: '2617267', roomType: 'Standard King Room' },
    { checkIn: getDateFromToday(5), checkOut: getDateFromToday(9), adults: 2, children: [] },
  ])
})

test('LiteAPI room: a guest-count change alone is repriced too', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(250.5, 3))
  const req = createMockRequest({ guests: 1 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  assert.equal((await res.json()).reservation.total_price, 250.5)
  assert.equal(liveRoomPrice.mock.calls[0].arguments[1].adults, 1)
})

test('LiteAPI room: an adult becoming a child is repriced for the new party, and saved', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(210, 3))
  const req = createMockRequest({ guests: 2, children: 1 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  const { reservation } = await res.json()
  assert.equal(reservation.total_price, 210)
  assert.equal(reservation.children, 1)
  assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1].adults, 1)
  assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1].children, [8])
})

test('a saved children count carries into a change that leaves it out', async () => {
  mockRoomResult = { data: { ...LITE_ROOM, capacity: 3 }, error: null }
  mockReservationResult.data = { ...mockReservationResult.data, guests: 3, children: 1 }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(480, 4))
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(9) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1].adults, 2)
  assert.deepEqual(liveRoomPrice.mock.calls[0].arguments[1].children, [8])
})

test('400 when the children leave no adult', async () => {
  const req = createMockRequest({ guests: 2, children: 2 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })
  assert.equal(res.status, 400)
  assert.equal(mockEditCalls.length, 0)
})

test('LiteAPI room sold out for the new dates: 409 and nothing updated', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => ({ status: 'sold_out' }))
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(9) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 409)
  assert.equal((await res.json()).error, 'Room is not available for those dates.')
  assert.equal(mockEditCalls.length, 0)
})

test('LiteAPI unavailable: the change is priced at the stored nightly rate', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(9) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  assert.equal((await res.json()).reservation.total_price, 480)
  assert.equal(liveRoomPrice.mock.callCount(), 1)
  assert.equal(mockEditCalls.length, 1)
})

test('a live-priced change that clashes with another booking: 409', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(487.31, 4))
  mockEditResult = {
    data: null,
    error: { code: EXCLUSION_VIOLATION },
  }
  const req = createMockRequest({ check_in: getDateFromToday(5), check_out: getDateFromToday(9) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 409)
  assert.equal(mockEditCalls.length, 1)
})

test('unchanged room, dates and guests keep the booked total without calling LiteAPI', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(999, 3))
  const { room_id, check_in, check_out, guests } = mockReservationResult.data
  // A booking saved before the children column existed counts as 0 children
  const req = createMockRequest({ room_id, check_in, check_out, guests, children: 0 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  assert.equal((await res.json()).reservation.total_price, 300)
  assert.equal(liveRoomPrice.mock.callCount(), 0)
  assert.equal(mockEditCalls.length, 0)
})

test('a children change alone is not "unchanged"', async () => {
  mockRoomResult = { data: { ...LITE_ROOM }, error: null }
  liveRoomPrice.mock.mockImplementation(async () => liveQuote(270, 3))
  const { room_id, check_in, check_out, guests } = mockReservationResult.data
  const req = createMockRequest({ room_id, check_in, check_out, guests, children: 1 })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'res-1' }) })

  assert.equal(res.status, 200)
  assert.equal((await res.json()).reservation.total_price, 270)
  assert.equal(liveRoomPrice.mock.callCount(), 1)
})