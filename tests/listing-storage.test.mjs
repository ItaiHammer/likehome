// Audit F2: owner listings are saved in the vocabulary search and the stay page read
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amenitiesFromTags, amenitiesToTags, countryFromStored, countryToStored, mergeAmenityTags } from '../lib/listing-storage.ts'

test('countries are stored the way search matches them', () => {
  assert.equal(countryToStored('US'), 'USA')
  assert.equal(countryToStored('CA'), 'Canada')
  assert.equal(countryToStored('GB'), 'United Kingdom')
})

test('stored countries load back as the editor ISO code, including older saves', () => {
  assert.equal(countryFromStored('USA'), 'US')
  assert.equal(countryFromStored('United States'), 'US')
  assert.equal(countryFromStored('Canada'), 'CA')
  assert.equal(countryFromStored('US'), 'US') // saved before this fix
  assert.equal(countryFromStored(null), '')
})

test('amenities become the tags search filters on', () => {
  assert.deepEqual(amenitiesToTags(['pool', 'wifi', 'parking']), ['Free Wi-Fi', 'Parking', 'Pool'])
  assert.deepEqual(amenitiesToTags(['fitness_center', 'family_rooms']), ['Gym', 'Families'])
})

test('tags load back as editor amenities, including raw ids from older saves', () => {
  assert.deepEqual(amenitiesFromTags(['Pool', 'Free Wi-Fi', 'EV Charging']), ['wifi', 'pool'])
  assert.deepEqual(amenitiesFromTags(['wifi', 'parking']), ['wifi', 'parking'])
})

test('saving amenities keeps tags the editor does not manage', () => {
  assert.deepEqual(mergeAmenityTags(['EV Charging', 'wifi', 'Pool'], ['parking']), ['EV Charging', 'Parking'])
})
