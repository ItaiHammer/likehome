import { test } from 'node:test'
import assert from 'node:assert/strict'
import { distanceKm, farFrom } from '../lib/liteapi/near.ts'

const LAKE_PLACID_NY = [44.2795, -73.9799]

test('distanceKm measures along the globe', () => {
  assert.equal(Math.round(distanceKm([48.8566, 2.3522], [51.5074, -0.1278])), 344, 'Paris to London')
  assert.equal(distanceKm(LAKE_PLACID_NY, LAKE_PLACID_NY), 0)
})

test('farFrom drops a same-named town elsewhere and keeps the city', () => {
  assert.equal(farFrom({ latitude: 44.29, longitude: -73.98 }, LAKE_PLACID_NY), false)
  assert.equal(farFrom({ latitude: 27.29, longitude: -81.36 }, LAKE_PLACID_NY), true, 'Lake Placid, Florida')
  // No coordinates, or LiteAPI's 0,0 placeholder: left to the zip check
  assert.equal(farFrom({}, LAKE_PLACID_NY), false)
  assert.equal(farFrom({ latitude: 0, longitude: 0 }, LAKE_PLACID_NY), false)
})
