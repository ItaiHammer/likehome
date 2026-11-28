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

test('display at most nine recently viewed hotels while preserving the stored history', () => {
  assert.equal(RECENTLY_VIEWED_CARDS, 9)
  const rows = Array.from({ length: 10 }, (_, i) => viewed(hotel(`h${i}`)))
  assert.deepEqual(toRecentlyViewedCards(rows).map((c) => c.id),
    ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'])
  assert.equal(rows.length, 10)
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
  assert.deepEqual(toRecentlyViewedCards(rows).map((c) => c.id), ['h1', 'h2', 'h3', 'h4', 'h5'])
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


test('the shared card carries actual amenities and prices when present, without inventing missing values', () => {
  const [populated, unknown] = toRecentlyViewedCards([
    viewed(hotel('known', { tags: ['Pool', 'Parking'], min_price: 189, max_capacity: 4 })),
    viewed(hotel('unknown', { tags: [], min_price: null, max_capacity: null })),
  ])
  assert.deepEqual({ tags: populated.tags, priceFrom: populated.priceFrom, maxCapacity: populated.maxCapacity }, {
    tags: ['Pool', 'Parking'], priceFrom: 189, maxCapacity: 4,
  })
  assert.equal('priceFrom' in unknown, false)
  assert.equal('tags' in unknown, false)
})

test('homepage cards derive real room price, capacity and count when the hotel record includes rooms', () => {
  const [card] = toRecentlyViewedCards([viewed(hotel('real', {
    description: 'A real description', rooms: [
      { price_per_night: 190, capacity: 4 },
      { price_per_night: 140, capacity: 2 },
    ],
  }))]);
  assert.equal(card.description, 'A real description');
  assert.equal(card.priceFrom, 140);
  assert.equal(card.maxCapacity, 4);
  assert.equal(card.roomOptions, 2);
});
