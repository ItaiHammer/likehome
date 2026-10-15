// Live LiteAPI quotes on the stay page: withLiveRoomPrices (app/reserve/[slug]/hotelStay.ts) and
// GET /api/stays/[id]/prices. The database helpers and the rates module are mocked.
import { register } from 'node:module'
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Node can't resolve Next's `@/` alias, so map it here
const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      return next(s, c)
    }`)
)

const HOTEL_ID = '0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b'
const hotelRow = { id: HOTEL_ID, name: 'Hyatt Regency', city: 'San Francisco', region: 'CA', country: 'US', photo_urls: [], rating: 4.5, tags: [], liteapi_id: 'lp1' }
const roomRow = (id, liteapiRoomId, price, capacity = 4) => ({
  id, room_type: `Stored ${id}`, price_per_night: price, capacity, num_beds: 1, bed_size: 'King', tags: [], liteapi_room_id: liteapiRoomId,
})
let hotel
let rooms
mock.module('@/utils/hotels', { namedExports: { getHotel: async () => ({ data: hotel, error: null }) } })
mock.module('@/utils/rooms', { namedExports: { getRoomsByHotel: async () => ({ data: rooms, error: null }) } })

const quote = (perNight, more = {}) => ({
  total: perNight * 2, perNight, offerId: 'o', rateName: 'King Room - Mobility Accessible', boardType: 'RO',
  refundable: true, cancelBy: '2026-11-07', dueAtProperty: 82, ...more,
})
let rates
const getRoomRates = mock.fn(async (ids) => new Map(ids.map((id) => [id, rates])))
const quoteForRoom = (r, room) => (room.liteapiRoomId in r.byRoom ? { status: 'live', value: r.byRoom[room.liteapiRoomId] } : { status: 'sold_out' })
mock.module('@/lib/liteapi/rates', { namedExports: { getRoomRates, quoteForRoom, liveRatesEnabled: () => true } })

const { getHotelStay, withLiveRoomPrices } = await import('../app/reserve/[slug]/hotelStay.ts')
const { GET } = await import('../app/api/stays/[id]/prices/route.ts')

const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const Q = { checkIn: day(20), checkOut: day(22), adults: 2, children: [8, 8] }

beforeEach(() => {
  hotel = { ...hotelRow }
  rooms = [roomRow('king', '101', 150), roomRow('twin', '102', 120)]
  rates = { status: 'live', value: { mapped: true, byName: {}, byRoom: { 101: quote(99.47) }, cheapest: quote(99.47) } }
  getRoomRates.mock.resetCalls()
})

test('a quoted room shows the rate’s own name, price, cancellation terms and fees at the property', async () => {
  const stay = await withLiveRoomPrices(await getHotelStay(HOTEL_ID), Q)
  assert.deepEqual(getRoomRates.mock.calls[0].arguments, [['lp1'], Q])
  assert.equal(stay.priceSource, 'live')
  const king = stay.rooms.find((r) => r.id === 'king')
  assert.equal(king.name, 'King Room - Mobility Accessible')
  assert.equal(king.nightly, 99.47)
  assert.deepEqual([king.refundable, king.cancelBy, king.dueAtProperty], [true, '2026-11-07', 82])
  // No offer at a mapped hotel: sold out, and no terms promised
  const twin = stay.rooms.find((r) => r.id === 'twin')
  assert.equal(twin.soldOut, true)
  assert.equal(twin.refundable, undefined)
  assert.equal(twin.name, 'Stored twin')
})

test('a rate without a room name keeps the stored one', async () => {
  rates.value.byRoom['101'] = quote(99, { rateName: '' })
  const stay = await withLiveRoomPrices(await getHotelStay(HOTEL_ID), Q)
  assert.equal(stay.rooms.find((r) => r.id === 'king').name, 'Stored king')
})

test('children count toward the biggest room before LiteAPI is asked', async () => {
  rooms = [roomRow('king', '101', 150, 3)]
  const stay = await withLiveRoomPrices(await getHotelStay(HOTEL_ID), Q)
  assert.equal(stay.priceSource, 'stored')
  assert.equal(getRoomRates.mock.callCount(), 0)
})

const get = async (query) => {
  const res = await GET(new Request(`http://localhost/api/stays/${HOTEL_ID}/prices?${new URLSearchParams(query)}`), {
    params: Promise.resolve({ id: HOTEL_ID }),
  })
  return { status: res.status, body: await res.json() }
}

test('the prices route quotes adults and children apart, each child at the default age', async () => {
  const r = await get({ checkIn: Q.checkIn, checkOut: Q.checkOut, adults: '2', children: '2' })
  assert.equal(r.status, 200)
  assert.deepEqual(getRoomRates.mock.calls[0].arguments[1], Q)
  assert.deepEqual(r.body.rooms, [
    { id: 'king', name: 'King Room - Mobility Accessible', nightly: 99.47, soldOut: false, refundable: true, cancelBy: '2026-11-07', dueAtProperty: 82 },
    // Every key is sent, so the page drops what an earlier quote showed
    { id: 'twin', name: 'Stored twin', nightly: 120, soldOut: true, refundable: null, cancelBy: null, dueAtProperty: null },
  ])

  await get({ checkIn: Q.checkIn, checkOut: Q.checkOut, adults: '3' })
  assert.deepEqual(getRoomRates.mock.calls[1].arguments[1], { ...Q, adults: 3, children: [] })
})

test('the prices route takes the stay page’s guest limits', async () => {
  const dates = { checkIn: Q.checkIn, checkOut: Q.checkOut }
  for (const guests of [{}, { adults: '0' }, { adults: '17' }, { adults: '2', children: '11' }, { adults: '2', children: '-1' }, { adults: '1.5' }, { guests: '3' }]) {
    const r = await get({ ...dates, ...guests })
    assert.equal(r.status, 400, JSON.stringify(guests))
  }
  assert.equal((await get({ ...dates, adults: '16', children: '10' })).status, 200)
})
