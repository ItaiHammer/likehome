// Tests for lib/recently-viewed.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { RECENTLY_VIEWED_CARDS, toRecentlyViewedCards } = await import('../lib/recently-viewed.ts')

const hotel = (id, more = {}) => ({
  id,
  name: `Hotel ${id}`,
  city: 'Monterey',
  region: 'California',
  country: 'USA',
  photo_urls: [`${id}.jpg`, `${id}-2.jpg`],
  liteapi_deleted_at: null,
  ...more,
})
const viewed = (h, at = '2026-11-20T10:00:00Z') => ({ viewed_at: at, hotels: h })

test('a card has the name, "City, Region, Country", the first photo and the hotel page link', () => {
  assert.deepEqual(toRecentlyViewedCards([viewed(hotel('h1'))]), [
    { id: 'h1', name: 'Hotel h1', location: 'Monterey, California, USA', photo: 'h1.jpg', href: '/reserve/h1' },
  ])
})

test('the first 4 hotels, newest first as the history is read', () => {
  assert.equal(RECENTLY_VIEWED_CARDS, 4)
  const rows = Array.from({ length: 7 }, (_, i) => viewed(hotel(`h${i}`)))
  assert.deepEqual(toRecentlyViewedCards(rows).map((c) => c.id), ['h0', 'h1', 'h2', 'h3'])
})

test('a hotel viewed twice shows once, where it was viewed last', () => {
  const rows = [viewed(hotel('a')), viewed(hotel('b')), viewed(hotel('a')), viewed(hotel('c'))]
  assert.deepEqual(toRecentlyViewedCards(rows).map((c) => c.id), ['a', 'b', 'c'])
})

test('missing and delisted hotels are left out, and later ones fill their places', () => {
  const rows = [
    viewed(null),
    viewed(hotel('gone', { liteapi_deleted_at: '2026-11-01T00:00:00Z' })),
    { viewed_at: '2026-11-20T10:00:00Z' },
    null,
    ...['h1', 'h2', 'h3', 'h4', 'h5'].map((id) => viewed(hotel(id))),
  ]
  assert.deepEqual(toRecentlyViewedCards(rows).map((c) => c.id), ['h1', 'h2', 'h3', 'h4'])
})

test('no photos (or only blank ones) give no photo, so the card shows the placeholder', () => {
  for (const photo_urls of [null, [], ['', null]]) {
    assert.equal(toRecentlyViewedCards([viewed(hotel('h1', { photo_urls }))])[0].photo, null, JSON.stringify(photo_urls))
  }
  assert.equal(toRecentlyViewedCards([viewed(hotel('h1', { photo_urls: ['', 'b.jpg'] }))])[0].photo, 'b.jpg')
})

test('blank location parts are left out', () => {
  const [kyoto, none] = toRecentlyViewedCards([
    viewed(hotel('k', { city: 'Kyoto', region: null, country: 'Japan' })),
    viewed(hotel('n', { city: '', region: null, country: null })),
  ])
  assert.equal(kyoto.location, 'Kyoto, Japan')
  assert.equal(none.location, '')
})

test('no history, or a non-list, gives no cards', () => {
  for (const rows of [[], null, undefined, { error: 'x' }]) assert.deepEqual(toRecentlyViewedCards(rows), [])
})
