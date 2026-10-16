// Tests for lib/liteapi/catalog.ts — run with `npm test`
// fetch is mocked; every response below is a small hand-written fixture.
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

const { placeSuggestions, findPlace, hotelsInPlace, facilityNames, catalogEnabled, LIST_LIMIT, __clearCatalogCache } = await import(
  '../lib/liteapi/catalog.ts'
)

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const fetchMock = mock.method(globalThis, 'fetch', async () => json({ data: [] }))
const warn = mock.method(console, 'warn', () => {})
const urlOf = (call = 0) => new URL(fetchMock.mock.calls[call].arguments[0])

const PARIS = { placeId: 'ChIJparis', displayName: 'Paris', formattedAddress: 'France', types: ['locality'] }

beforeEach(() => {
  __clearCatalogCache()
  fetchMock.mock.resetCalls()
  fetchMock.mock.mockImplementation(async () => json({ data: [] }))
  warn.mock.resetCalls()
  process.env.LITEAPI_KEY = 'test'
})

test('placeSuggestions asks /data/places once per text and skips one-letter text', async () => {
  fetchMock.mock.mockImplementation(async () => json({ data: [PARIS, { placeId: '' }, null] }))
  assert.deepEqual(await placeSuggestions('  Paris   France '), [PARIS])
  assert.equal(urlOf().pathname, '/v3.0/data/places')
  assert.equal(urlOf().searchParams.get('textQuery'), 'Paris France')
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers['X-API-Key'], 'test')

  assert.deepEqual(await findPlace('paris france'), PARIS, 'same text in other case is cached')
  assert.equal(fetchMock.mock.callCount(), 1)

  assert.deepEqual(await placeSuggestions('P'), [])
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('a failed call is not remembered', async () => {
  fetchMock.mock.mockImplementation(async () => json({ error: { code: 500 } }, 500))
  assert.equal(await findPlace('Paris'), null)
  fetchMock.mock.mockImplementation(async () => json({ data: [PARIS] }))
  assert.deepEqual(await findPlace('Paris'), PARIS)
  assert.equal(fetchMock.mock.callCount(), 2)
  assert.equal(warn.mock.callCount(), 1)
})

test('a network error counts as a failed call', async () => {
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError('fetch failed')
  })
  assert.equal(await hotelsInPlace('ChIJparis'), null)
  assert.deepEqual(await placeSuggestions('Paris'), [])
})

test('hotelsInPlace lists the place, leaving out deleted and merged hotels', async () => {
  fetchMock.mock.mockImplementation(async () => json({
    data: [
      { id: 'lp1', name: 'Kept' },
      { id: 'lp2', name: 'Deleted', deletedAt: '2026-10-01' },
      { id: 'lp3', name: 'Merged', primaryHotelId: 'lp1' },
      { id: 'lp4', name: 'Its own primary', primaryHotelId: 'lp4' },
      { id: '', name: 'No id' },
    ],
  }))
  assert.deepEqual((await hotelsInPlace('ChIJparis')).map((h) => h.id), ['lp1', 'lp4'])
  assert.equal(urlOf().pathname, '/v3.0/data/hotels')
  assert.equal(urlOf().searchParams.get('placeId'), 'ChIJparis')
  assert.equal(urlOf().searchParams.get('limit'), String(LIST_LIMIT))
  await hotelsInPlace('ChIJparis')
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('facilityNames maps ids to English names, and is empty when LiteAPI fails', async () => {
  fetchMock.mock.mockImplementation(async () => json({ data: [{ facility_id: 2, facility: 'Parking' }, { facility_id: 'x', facility: 'Bad' }] }))
  assert.deepEqual([...await facilityNames()], [[2, 'Parking']])

  __clearCatalogCache()
  fetchMock.mock.mockImplementation(async () => json({}, 503))
  assert.equal((await facilityNames()).size, 0)
})

test('without a key nothing is asked', async () => {
  delete process.env.LITEAPI_KEY
  assert.equal(catalogEnabled(), false)
  assert.equal(await hotelsInPlace('ChIJparis'), null)
  assert.deepEqual(await placeSuggestions('Paris'), [])
  assert.equal(fetchMock.mock.callCount(), 0)
})
