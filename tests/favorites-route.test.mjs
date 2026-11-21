// Tests for app/api/favorites/route.ts and lib/saved-hotels.ts. Run with `npm test`. The data helpers are mocked.
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const HOTEL = '6f1c2b0e-3a4d-4e5f-8a9b-0c1d2e3f4a5b'
const OTHER = 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d'

let userId
let calls
let addResult
let removeResult
let listResult

mock.module('../utils/user.ts', {
  namedExports: { getUserId: async () => ({ userId }) },
})

mock.module('../utils/favorite-hotels.ts', {
  namedExports: {
    addFavoriteHotel: async (accountId, hotelId) => {
      calls.push(['add', accountId, hotelId])
      return addResult
    },
    removeFavoriteHotel: async (accountId, hotelId) => {
      calls.push(['remove', accountId, hotelId])
      return removeResult
    },
    getFavoriteHotels: async (accountId) => {
      calls.push(['list', accountId])
      return listResult
    },
  },
})

const { GET, POST, DELETE } = await import('../app/api/favorites/route.ts')
const { isHotelId, legacySavedIds, legacyCopyFinished } = await import('../lib/saved-hotels.ts')

const send = (method, body) =>
  new Request('http://localhost/api/favorites', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

beforeEach(() => {
  userId = 'user-1'
  calls = []
  addResult = { data: [{ id: 'fav-1' }], error: null }
  removeResult = { error: null }
  listResult = { data: [{ created_at: '2026-11-02', hotels: { id: OTHER } }, { created_at: '2026-11-01', hotels: { id: HOTEL } }], error: null }
})

test('every method answers 401 when signed out, without touching the database', async () => {
  userId = null
  for (const res of [await GET(), await POST(send('POST', { hotelId: HOTEL })), await DELETE(send('DELETE', { hotelId: HOTEL }))]) {
    assert.equal(res.status, 401)
    assert.equal((await res.json()).error, 'You must be logged in to save hotels.')
  }
  assert.deepEqual(calls, [])
})

test('POST and DELETE answer 400 for a missing, malformed or sample-stay hotel id', async () => {
  for (const body of [{}, { hotelId: 42 }, { hotelId: 'sunset-cabin' }, { hotelId: `${HOTEL}x` }, 'not json']) {
    assert.equal((await POST(send('POST', body))).status, 400)
    assert.equal((await DELETE(send('DELETE', body))).status, 400)
  }
  assert.deepEqual(calls, [])
})

test('POST saves the hotel for the signed-in user', async () => {
  const res = await POST(send('POST', { hotelId: HOTEL.toUpperCase() }))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { data: { hotelId: HOTEL, saved: true }, error: null })
  assert.deepEqual(calls, [['add', 'user-1', HOTEL]])
})

test('POST answers 404 when the hotel no longer exists and 500 on other errors', async () => {
  addResult = { data: null, error: { code: '23503', message: 'fk' } }
  assert.equal((await POST(send('POST', { hotelId: HOTEL }))).status, 404)
  addResult = { data: null, error: { code: '500', message: 'down' } }
  assert.equal((await POST(send('POST', { hotelId: HOTEL }))).status, 500)
})

test('DELETE removes the hotel for the signed-in user', async () => {
  const res = await DELETE(send('DELETE', { hotelId: HOTEL }))
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { data: { hotelId: HOTEL, saved: false }, error: null })
  assert.deepEqual(calls, [['remove', 'user-1', HOTEL]])
  removeResult = { error: { message: 'down' } }
  assert.equal((await DELETE(send('DELETE', { hotelId: HOTEL }))).status, 500)
})

test('GET lists the saved hotel ids newest first, skipping rows whose hotel is gone', async () => {
  listResult.data.push({ created_at: '2026-10-01', hotels: null })
  const res = await GET()
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { data: [OTHER, HOTEL], error: null })
  assert.deepEqual(calls, [['list', 'user-1']])
})

test('GET answers 500 when the list cannot be read', async () => {
  listResult = { data: null, error: { message: 'down' } }
  assert.equal((await GET()).status, 500)
})

test('isHotelId accepts only hotels uuids', () => {
  assert.equal(isHotelId(HOTEL), true)
  assert.equal(isHotelId('sunset-cabin'), false)
  assert.equal(isHotelId(null), false)
})

test('legacySavedIds keeps unique hotel ids the account does not have yet', () => {
  const raw = JSON.stringify([HOTEL, 'sunset-cabin', OTHER.toUpperCase(), HOTEL, 7])
  assert.deepEqual(legacySavedIds(raw), [HOTEL, OTHER])
  assert.deepEqual(legacySavedIds(raw, [HOTEL]), [OTHER])
  assert.deepEqual(legacySavedIds(null), [])
  assert.deepEqual(legacySavedIds('{oops'), [])
  assert.deepEqual(legacySavedIds('{"a":1}'), [])
})

test('legacyCopyFinished keeps the old list only when a copy could still succeed later', () => {
  assert.equal(legacyCopyFinished([]), true)
  assert.equal(legacyCopyFinished([200, 404, 400]), true)
  assert.equal(legacyCopyFinished([200, 0]), false)
  assert.equal(legacyCopyFinished([500]), false)
  assert.equal(legacyCopyFinished([401]), false)
})
