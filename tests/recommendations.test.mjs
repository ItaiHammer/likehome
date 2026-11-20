// Tests for lib/recommendations.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { recommendationPlace, toRecommendedCards, recommendationSubtitle } = await import('../lib/recommendations.ts')

test('place: the latest viewed hotel’s city wins over the time zone', () => {
  const summary = { city: 'San Francisco', region: 'California', country: 'USA', minPrice: 150, maxPrice: 300 }
  assert.deepEqual(recommendationPlace(summary, 'America/Los_Angeles'), {
    basis: 'history',
    city: 'San Francisco',
    region: 'California',
    country: 'USA',
    where: 'San Francisco, California, USA',
  })
})

test('place: no history in the demo time zone → Los Angeles', () => {
  assert.deepEqual(recommendationPlace(null, 'America/Los_Angeles'), {
    basis: 'time-zone',
    city: 'Los Angeles',
    region: 'California',
    country: 'USA',
    where: 'Los Angeles, California, USA',
  })
})

test('place: no history in any other time zone, or none → New York', () => {
  for (const tz of ['Europe/London', 'America/New_York', undefined]) {
    const place = recommendationPlace(null, tz)
    assert.equal(place.basis, 'default', String(tz))
    assert.equal(place.where, 'New York, New York, USA', String(tz))
  }
})

test('place: a blank city counts as no history', () => {
  const place = recommendationPlace({ city: '', region: '', country: '' }, 'America/Los_Angeles')
  assert.equal(place.basis, 'time-zone')
  assert.equal(place.city, 'Los Angeles')
})

test('place: blank or missing parts are left out of the search location', () => {
  assert.equal(recommendationPlace({ city: 'Paris', region: '   ', country: 'France' }).where, 'Paris, France')
  const place = recommendationPlace({ city: 'Tokyo', region: null })
  assert.equal(place.where, 'Tokyo')
  assert.equal(place.country, null)
})

const row = (id, more = {}) => ({ id, name: `Hotel ${id}`, city: 'Los Angeles', min_price: 180, liteapi_id: null, ...more })

test('cards: the first 6 rows, in the order the search ranked them', () => {
  const rows = Array.from({ length: 21 }, (_, i) => row(`h${i}`))
  assert.deepEqual(toRecommendedCards(rows, false).map((r) => r.id), ['h0', 'h1', 'h2', 'h3', 'h4', 'h5'])
})

test('cards: a smaller limit (the signed-in home page) keeps the first rows only', () => {
  const rows = Array.from({ length: 6 }, (_, i) => row(`h${i}`))
  for (const liveRates of [true, false]) {
    assert.deepEqual(toRecommendedCards(rows, liveRates, 3).map((r) => r.id), ['h0', 'h1', 'h2'])
  }
})

test('cards: with live rates on, LiteAPI hotels ask for dates instead of showing a stored price, like /search', () => {
  const [owner, liteapi] = toRecommendedCards([row('a'), row('b', { liteapi_id: 'lp123' })], true)
  assert.equal(owner.min_price, 180)
  assert.equal(owner.price_status, undefined)
  assert.equal(liteapi.min_price, null)
  assert.equal(liteapi.price_status, 'needs-dates')
  assert.equal(liteapi.name, 'Hotel b')
})

test('cards: with live rates off, stored prices hold, so LiteAPI hotels keep theirs', () => {
  const [liteapi] = toRecommendedCards([row('b', { liteapi_id: 'lp123' })], false)
  assert.equal(liteapi.min_price, 180)
  assert.equal(liteapi.price_status, undefined)
})

test('cards: no rows, or a non-list, give no cards', () => {
  for (const liveRates of [true, false]) {
    assert.deepEqual(toRecommendedCards([], liveRates), [])
    assert.deepEqual(toRecommendedCards(null, liveRates), [])
    assert.deepEqual(toRecommendedCards({ error: 'x' }, liveRates), [])
  }
})

test('subtitle: says when the picks come from the guest’s viewing history', () => {
  assert.equal(recommendationSubtitle({ basis: 'history', city: 'San Francisco' }), 'Picked from the stays you’ve viewed in San Francisco.')
  for (const basis of ['time-zone', 'default']) {
    assert.equal(recommendationSubtitle({ basis, city: 'Los Angeles' }), 'A few places to stay in Los Angeles to get you started.')
  }
})
