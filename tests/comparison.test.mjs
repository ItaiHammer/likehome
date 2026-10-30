import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparisonIds, inIdOrder, toComparisonListing } from '../lib/comparison.ts'
import { propertyAmenities, roomAmenities } from '../app/search/types.ts'

const room = (price, more = {}) => ({ price_per_night: price, capacity: 2, tags: [], ...more })
const hotel = (more = {}) => ({
  id: 'h1',
  name: 'Harbor House',
  city: 'Monterey',
  region: 'California',
  country: 'US',
  photo_urls: ['a.jpg', 'b.jpg'],
  rating: 4.8,
  tags: [],
  liteapi_deleted_at: null,
  rooms: [room(189)],
  ...more,
})
const statusOf = (listing, label) => listing.amenities.find((a) => a.label === label).status

test('an amenity on the hotel or every room is available, on some rooms is "some rooms", nowhere is not offered', () => {
  const listing = toComparisonListing(
    hotel({ tags: ['Cribs'], rooms: [room(189, { tags: ['Kitchen', 'Free Wi-Fi'] }), room(220, { tags: ['Free Wi-Fi'] })] }),
  )
  assert.equal(statusOf(listing, 'Cribs'), 'available')
  assert.equal(statusOf(listing, 'Free Wi-Fi'), 'available')
  assert.equal(statusOf(listing, 'Kitchen'), 'some-rooms')
  assert.equal(statusOf(listing, 'Pool'), 'not-offered')
})

test('every listing has the same amenities in the filters’ order', () => {
  const order = [...propertyAmenities, ...roomAmenities]
  assert.deepEqual(toComparisonListing(hotel({ tags: ['Pool'] })).amenities.map((a) => a.label), order)
  assert.deepEqual(toComparisonListing(hotel()).amenities.map((a) => a.label), order)
})

test('traveler types go under goodFor, not amenities', () => {
  const listing = toComparisonListing(hotel({ tags: ['Families', 'Pool'], rooms: [room(189, { tags: ['Kids'] })] }))
  assert.deepEqual(listing.goodFor, ['Families', 'Kids'])
  assert.ok(!listing.amenities.some((a) => a.label === 'Families'))
})

test('price is the cheapest room and guests the largest room', () => {
  const listing = toComparisonListing(
    hotel({ rooms: [room('219.00', { capacity: 2 }), room(175, { capacity: 4 }), room(305, { capacity: null })] }),
  )
  assert.equal(listing.priceFrom, 175)
  assert.equal(listing.sleepsUpTo, 4)
  assert.equal(toComparisonListing(hotel({ rooms: [room(100, { capacity: null })] })).sleepsUpTo, 2)
})

test('rating, location and photo fall back cleanly', () => {
  assert.equal(toComparisonListing(hotel({ rating: '4.6' })).rating, 4.6)
  assert.equal(toComparisonListing(hotel({ rating: null })).rating, null)
  assert.equal(toComparisonListing(hotel({ rating: 'n/a' })).rating, null)
  assert.equal(toComparisonListing(hotel({ region: null })).location, 'Monterey, US')
  assert.equal(toComparisonListing(hotel()).photo, 'a.jpg')
  assert.equal(toComparisonListing(hotel({ photo_urls: ['', 'b.jpg'] })).photo, 'b.jpg')
  assert.equal(toComparisonListing(hotel({ photo_urls: null })).photo, null)
})

test('keeps the time it was viewed, null when not from history', () => {
  assert.equal(toComparisonListing(hotel(), '2026-10-22T18:00:00Z').viewedAt, '2026-10-22T18:00:00Z')
  assert.equal(toComparisonListing(hotel()).viewedAt, null)
})

test('a missing, delisted or roomless hotel is left out', () => {
  assert.equal(toComparisonListing(null), null)
  assert.equal(toComparisonListing(hotel({ liteapi_deleted_at: '2026-10-01T00:00:00Z' })), null)
  assert.equal(toComparisonListing(hotel({ rooms: [] })), null)
  assert.equal(toComparisonListing(hotel({ rooms: null })), null)
})

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const D = '44444444-4444-4444-8444-444444444444'

test('compare ids: valid hotel ids only, no repeats, at most three', () => {
  assert.deepEqual(comparisonIds([C, 'junk', A, A.toUpperCase(), '', B, D]), [C, A, B])
  assert.deepEqual(comparisonIds(['fairmont-banff']), [])
})

test('listings come back in the order of the ids, skipping ids with no listing', () => {
  const listings = [A, B, C].map((id) => toComparisonListing(hotel({ id })))
  assert.deepEqual(inIdOrder(listings, [C, A]).map((l) => l.id), [C, A])
  assert.deepEqual(inIdOrder(listings, [D, B]).map((l) => l.id), [B])
})
