import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTravelerCategories } from '../lib/ideal-for.ts'

test('all traveler categories (including pets, couples and kids) remain visible', () => {
  assert.deepEqual(normalizeTravelerCategories(['Families', 'Kids', 'Pets', 'Couples', 'Friends']),
    ['Families', 'Kids', 'Pets', 'Couples', 'Friends'])
})

test('category names normalize casing and duplicates; future categories do not disappear', () => {
  assert.deepEqual(normalizeTravelerCategories(['pets', ' PETS ', 'kids', 'Friends', 'Solo travelers']),
    ['Pets', 'Kids', 'Friends', 'Solo travelers'])
})
