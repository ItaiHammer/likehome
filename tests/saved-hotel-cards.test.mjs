// Tests for lib/saved-hotel-cards.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { SAVED_HOTEL_CARDS, toSavedHotelCards } = await import('../lib/saved-hotel-cards.ts')
const { isListedHotel } = await import('../lib/recently-viewed.ts')

const hotel = (id, more = {}) => ({
  id,
  name: `Hotel ${id}`,
  city: 'Banff',
  region: 'Alberta',
  country: 'Canada',
  photo_urls: [`${id}.jpg`],
  liteapi_deleted_at: null,
  ...more,
})
const favorite = (h) => ({ created_at: '2026-11-20T10:00:00Z', hotels: h })
const favorites = (n) => Array.from({ length: n }, (_, i) => favorite(hotel(`h${i}`)))
const ids = (cards) => cards.map((c) => c.id)

test('a card has the name, location, first photo and the hotel page link', () => {
  assert.deepEqual(toSavedHotelCards([favorite(hotel('h1'))]), {
    cards: [{ id: 'h1', name: 'Hotel h1', location: 'Banff, Alberta, Canada', photo: 'h1.jpg', href: '/reserve/h1' }],
    more: false,
  })
})

test('gone and delisted hotels are skipped and not counted', () => {
  const gone = favorite(hotel('gone', { liteapi_deleted_at: '2026-11-01T00:00:00Z' }))
  const rows = [favorite(null), gone, null, favorite(hotel('a')), favorite(hotel('b')), gone, favorite(hotel('c'))]
  assert.deepEqual(ids(toSavedHotelCards(rows).cards), ['a', 'b', 'c'])
  assert.equal(toSavedHotelCards(rows).more, false)
})

test('the row shows the newest 3, and the "see all" tile only when there are more', () => {
  assert.equal(SAVED_HOTEL_CARDS, 3)
  assert.deepEqual(ids(toSavedHotelCards(favorites(3)).cards), ['h0', 'h1', 'h2'])
  assert.equal(toSavedHotelCards(favorites(3)).more, false)
  const twenty = toSavedHotelCards(favorites(20))
  assert.deepEqual(ids(twenty.cards), ['h0', 'h1', 'h2'])
  assert.equal(twenty.more, true)
})

test('nothing saved, or a non-list, gives no cards', () => {
  for (const rows of [[], null, undefined, { error: 'x' }]) assert.deepEqual(toSavedHotelCards(rows), { cards: [], more: false })
})

test('a hotel is listed only with an id and no delisted date', () => {
  assert.equal(isListedHotel(hotel('a')), true)
  assert.equal(isListedHotel(hotel('a', { liteapi_deleted_at: '2026-11-01T00:00:00Z' })), false)
  assert.equal(isListedHotel({ id: '' }), false)
  assert.equal(isListedHotel(null), false)
  assert.equal(isListedHotel(undefined), false)
})
