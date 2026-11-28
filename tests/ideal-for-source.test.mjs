import test from 'node:test'
import assert from 'node:assert/strict'
import { stayOffers } from '../lib/stay-filters.ts'

test('listing-derived traveler categories include all five supported tags', () => {
  const tags = ['Families', 'Kids', 'Pets', 'Couples', 'Friends']
  assert.deepEqual(stayOffers(tags, []).goodFor, tags)
})

test('room-only traveler tags also appear as Ideal for metadata', () => {
  assert.deepEqual(stayOffers([], [['Pets'], ['Kids']]).goodFor, ['Kids', 'Pets'])
})
