// Tests for lib/recommendations.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { recommendationPlace } = await import('../lib/recommendations.ts')

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
