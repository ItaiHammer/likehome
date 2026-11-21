// Tests for lib/saved-hotel-cards.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { SAVED_HOTEL_CARDS, shownSavedHotels, toSavedHotelCards } = await import('../lib/saved-hotel-cards.ts')

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
    total: 1,
  })
})

test('gone and delisted hotels are skipped and not counted', () => {
  const rows = [favorite(null), favorite(hotel('gone', { liteapi_deleted_at: '2026-11-01T00:00:00Z' })), null, favorite(hotel('a')), favorite(hotel('b'))]
  assert.deepEqual(toSavedHotelCards(rows), { cards: toSavedHotelCards([favorite(hotel('a')), favorite(hotel('b'))]).cards, total: 2 })
})

test('a long list keeps every card, newest first, so un-hearting always refills the row', () => {
  const saved = toSavedHotelCards(favorites(20))
  assert.equal(saved.total, 20)
  assert.equal(saved.cards.length, 20)
  assert.deepEqual(ids(saved.cards.slice(0, 3)), ['h0', 'h1', 'h2'])
})

test('nothing saved, or a non-list, gives no cards', () => {
  for (const rows of [[], null, undefined, { error: 'x' }]) assert.deepEqual(toSavedHotelCards(rows), { cards: [], total: 0 })
})

test('the row shows the newest 3, and the "see all" tile only when there are more', () => {
  assert.equal(SAVED_HOTEL_CARDS, 3)
  assert.deepEqual(shownSavedHotels(toSavedHotelCards(favorites(3)), null), {
    cards: toSavedHotelCards(favorites(3)).cards,
    more: false,
  })
  const four = shownSavedHotels(toSavedHotelCards(favorites(4)), null)
  assert.deepEqual(ids(four.cards), ['h0', 'h1', 'h2'])
  assert.equal(four.more, true)
})

test('an un-hearted hotel leaves the row and the next one takes its place', () => {
  const saved = toSavedHotelCards(favorites(4))
  const shown = shownSavedHotels(saved, new Set(['h0', 'h2', 'h3']))
  assert.deepEqual(ids(shown.cards), ['h0', 'h2', 'h3'])
  assert.equal(shown.more, false)
})

test('hotels past the spare cards still count toward "see all"', () => {
  const saved = toSavedHotelCards(favorites(20))
  const hearts = new Set(ids(saved.cards).slice(5))
  for (let i = saved.cards.length; i < 20; i++) hearts.add(`h${i}`)
  const shown = shownSavedHotels(saved, hearts)
  assert.deepEqual(ids(shown.cards), ['h5', 'h6', 'h7'])
  assert.equal(shown.more, true)
})

test('with every heart cleared the row is empty', () => {
  assert.deepEqual(shownSavedHotels(toSavedHotelCards(favorites(2)), new Set()), { cards: [], more: false })
})
