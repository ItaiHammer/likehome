// Tests for lib/liteapi/save.ts — run with `npm test`
// fetch and the Supabase admin client are mocked; nothing reaches LiteAPI or a database.
import { register } from 'node:module'
import { test, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// `server-only` is resolved by Next itself, so give Node an empty module for it
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s === 'server-only') return { url: 'data:text/javascript,', shortCircuit: true }
      return next(s, c)
    }`)
)

process.env.LITEAPI_KEY = 'test'

// A stand-in for the few Supabase calls save.ts makes. Every call is recorded as [table, op, ...args].
let db
function fakeDb({ saved = {}, failHotel = null, failRooms = false } = {}) {
  const ops = []
  const from = (table) => {
    const q = { table, op: 'select', filters: [], payload: null }
    const result = () => {
      if (q.table === 'hotels' && q.op === 'select') {
        const id = saved[q.filters.find(([col]) => col === 'liteapi_id')?.[1]]
        return { data: id ? { id } : null, error: null }
      }
      if (q.table === 'hotels' && q.op === 'insert') {
        if (failHotel) {
          if (failHotel.savedBy) saved[q.payload.liteapi_id] = failHotel.savedBy
          return { data: null, error: { code: '23505' } }
        }
        saved[q.payload.liteapi_id] = 'h-new'
        return { data: { id: 'h-new' }, error: null }
      }
      if (q.table === 'rooms' && q.op === 'insert') return { error: failRooms ? { code: '23514' } : null }
      return { error: null }
    }
    const builder = {
      select: () => builder,
      eq: (col, val) => (q.filters.push([col, val]), builder),
      insert: (payload) => ((q.op = 'insert'), (q.payload = payload), ops.push([table, 'insert', payload]), builder),
      delete: () => ((q.op = 'delete'), ops.push([table, 'delete', q.filters]), builder),
      maybeSingle: async () => result(),
      single: async () => result(),
      then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
    }
    return builder
  }
  return { client: { from }, ops, saved }
}

const createAdminClient = mock.fn(() => db?.client ?? null)
mock.module('../utils/supabase/admin.ts', { namedExports: { createAdminClient } })

const { saveLiteapiHotel, isLiteapiId } = await import('../lib/liteapi/save.ts')

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const usd = (amount) => [{ amount, currency: 'USD' }]
const DETAIL = {
  id: 'lp33281', name: 'Campfire Hotel', city: 'Bend', country: 'US', zip: 'OR 97701', address: '721 NE Third St',
  starRating: 3, location: { latitude: 44.06, longitude: -121.3 }, main_photo: 'https://img/main.jpg',
  rooms: [
    { id: 11, roomName: 'King Room', maxAdults: 2, maxChildren: 1, maxOccupancy: 3, bedTypes: [{ id: 10, quantity: 1, bedType: 'King bed' }] },
    { id: 12, roomName: 'Double Queen', maxAdults: 4, maxChildren: 2, maxOccupancy: 4, bedTypes: [{ id: 167, quantity: 2, bedType: 'Queen bed' }] },
  ],
}
const offer = (roomId, total) => ({ offerId: `o${roomId}`, rates: [{ mappedRoomId: roomId, name: 'Rate', boardType: 'RO', retailRate: { total: usd(total) } }] })
const RATES = { data: [{ hotelId: 'lp33281', roomTypes: [offer(11, 300), offer(12, 420)] }] }
const STAY = { checkIn: '2099-06-10', checkOut: '2099-06-12' }

let answers
const fetchMock = mock.method(globalThis, 'fetch', async (url, init) => {
  const path = new URL(url).pathname
  if (path.endsWith('/data/hotel')) return answers.detail()
  const body = JSON.parse(init.body)
  return answers.rates(body)
})
const warn = mock.method(console, 'warn', () => {})
const ratesCalls = () => fetchMock.mock.calls
  .filter((call) => new URL(call.arguments[0]).pathname.endsWith('/hotels/rates'))
  .map((call) => JSON.parse(call.arguments[1].body))

beforeEach(() => {
  db = fakeDb()
  answers = { detail: async () => json({ data: DETAIL }), rates: async () => json(RATES) }
  fetchMock.mock.resetCalls()
  warn.mock.resetCalls()
  process.env.LITEAPI_KEY = 'test'
})

test('a new hotel is saved with its rooms, priced from the guest stay, and its id comes back', async () => {
  assert.equal(await saveLiteapiHotel('lp33281', STAY), 'h-new')

  const [hotelOp, roomsOp] = db.ops
  assert.equal(hotelOp[0], 'hotels')
  const hotel = hotelOp[2]
  assert.deepEqual([hotel.liteapi_id, hotel.name, hotel.city, hotel.region, hotel.country, hotel.rating, hotel.latitude],
    ['lp33281', 'Campfire Hotel', 'Bend', 'Oregon', 'USA', 3, 44.06])
  assert.equal(hotel.owner_id, undefined, 'LiteAPI hotels have no owner')
  assert.equal(hotel.liteapi_synced_at, null, 'only a sync moves its city\'s --since auto window')

  assert.deepEqual(roomsOp.slice(0, 2), ['rooms', 'insert'])
  assert.deepEqual(roomsOp[2].map((r) => [r.hotel_id, r.liteapi_room_id, r.price_per_night, r.max_adults, r.bed_size]), [
    ['h-new', '11', 150, 2, 'King'],
    ['h-new', '12', 210, 4, 'Queen'],
  ])

  const [rates] = ratesCalls()
  assert.deepEqual([rates.hotelIds, rates.checkin, rates.checkout, rates.roomMapping], [['lp33281'], STAY.checkIn, STAY.checkOut, true])
})

test('a hotel already saved comes back without asking LiteAPI', async () => {
  db = fakeDb({ saved: { lp33281: 'h-old' } })
  assert.equal(await saveLiteapiHotel('lp33281', STAY), 'h-old')
  assert.equal(fetchMock.mock.callCount(), 0)
  assert.deepEqual(db.ops, [])
})

test('without the secret key, or with an id that is not LiteAPI-shaped, nothing happens', async () => {
  db = null
  assert.equal(await saveLiteapiHotel('lp33281', STAY), null)
  db = fakeDb()
  assert.equal(await saveLiteapiHotel('../hotels', STAY), null)
  assert.equal(fetchMock.mock.callCount(), 0)
  assert.deepEqual([isLiteapiId('lp1beec'), isLiteapiId('LP1BEEC'), isLiteapiId('lp'), isLiteapiId('lp1?x=1'), isLiteapiId('2c6e6c4a')], [true, true, false, false, false])
})

test('a sold-out stay falls back to one night 30 days out for the stored prices', async () => {
  answers.rates = async (body) => (body.checkin === STAY.checkIn ? new Response(null, { status: 204 }) : json(RATES))
  assert.equal(await saveLiteapiHotel('lp33281', STAY), 'h-new')
  const [first, second] = ratesCalls()
  assert.equal(first.checkin, STAY.checkIn)
  const nights = (Date.parse(second.checkout) - Date.parse(second.checkin)) / 86_400_000
  const ahead = Math.round((Date.parse(second.checkin) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000)
  assert.deepEqual([nights, ahead], [1, 30])
  assert.deepEqual(db.ops[1][2].map((r) => r.price_per_night), [300, 420], 'one night, so the totals are the nightly prices')
})

test('nothing is saved when LiteAPI has no details, no prices or no rooms', async () => {
  answers.detail = async () => json({ error: { code: 4002 } }, 400)
  assert.equal(await saveLiteapiHotel('lp33281', STAY), null)

  answers = { detail: async () => json({ data: DETAIL }), rates: async () => new Response(null, { status: 204 }) }
  assert.equal(await saveLiteapiHotel('lp33281', STAY), null)

  answers = { detail: async () => json({ data: { ...DETAIL, rooms: [] } }), rates: async () => json(RATES) }
  assert.equal(await saveLiteapiHotel('lp33281', STAY), null)

  answers = { detail: async () => json({ data: { ...DETAIL, deletedAt: '2026-10-01' } }), rates: async () => json(RATES) }
  assert.equal(await saveLiteapiHotel('lp33281', STAY), null)
  assert.deepEqual(db.ops, [])
})

test('when the rooms fail, the hotel this call saved is removed so the next visit tries again', async () => {
  db = fakeDb({ failRooms: true })
  assert.equal(await saveLiteapiHotel('lp33281', STAY), null)
  assert.deepEqual(db.ops.map(([table, op]) => `${table} ${op}`), ['hotels insert', 'rooms insert', 'hotels delete'])
  assert.deepEqual(db.ops[2][2], [['id', 'h-new']])
})

test('when another visit saved the hotel first, its id comes back', async () => {
  db = fakeDb({ failHotel: { savedBy: 'h-other' } })
  assert.equal(await saveLiteapiHotel('lp33281', STAY), 'h-other')
  assert.deepEqual(db.ops.map(([table, op]) => `${table} ${op}`), ['hotels insert'])
  assert.equal(warn.mock.callCount(), 0)
})
