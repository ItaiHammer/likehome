import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roomAmenityList, stayOffers } from '../lib/stay-filters.ts'
import { propertyAmenities, roomAmenities, tags as filterTags, travelerTypes } from '../app/search/types.ts'

// What the stay page lists for a tag, in either the amenities row or "Good for"
const listed = ({ offers, goodFor }) => [...offers.map((o) => o.label), ...goodFor]

// search_hotels finds a hotel for a tag when the hotel or one of its rooms has it (p_tags <@ h.tags || rm.tags).
// Every filter tag must then show on the stay page, and only those.
test('every filter tag a search can match shows on the stay page', () => {
  for (const tag of filterTags) {
    assert.ok(listed(stayOffers([tag], [[], []])).includes(tag), `${tag} on the hotel`)
    assert.ok(listed(stayOffers([], [[], [tag]])).includes(tag), `${tag} on one room`)
    assert.ok(!listed(stayOffers([], [[], []])).includes(tag), `${tag} nowhere`)
  }
})

test('amenities come in the filters’ order with their names, traveler types under Good for', () => {
  const { offers, goodFor } = stayOffers(['Pets', 'Pool', 'Parking', 'Not a filter'], [['Free Wi-Fi', 'Kitchen'], ['Kitchen', 'Families']])
  assert.deepEqual(offers, [{ label: 'Parking' }, { label: 'Pool' }, { label: 'Kitchen', someRooms: false }, { label: 'Free Wi-Fi', someRooms: true }])
  assert.deepEqual(goodFor, ['Families', 'Pets'])
  const order = [...propertyAmenities, ...roomAmenities]
  assert.deepEqual(offers.map((o) => order.indexOf(o.label)), [...offers.map((o) => order.indexOf(o.label))].sort((a, b) => a - b))
  assert.ok(goodFor.every((t) => travelerTypes.includes(t)))
})

test('"some rooms" only when the hotel lacks the tag and not every room has it', () => {
  assert.deepEqual(stayOffers([], [['Kitchen'], ['Kitchen']]).offers, [{ label: 'Kitchen', someRooms: false }])
  assert.deepEqual(stayOffers([], [['Kitchen'], null]).offers, [{ label: 'Kitchen', someRooms: true }])
  assert.deepEqual(stayOffers(['Kitchen'], [[], []]).offers, [{ label: 'Kitchen' }])
})

test('a room card lists its own amenities in the filters’ order', () => {
  assert.deepEqual(roomAmenityList(['Housekeeping', 'Pool', 'Free Wi-Fi', 'Pets', 'Kitchen']), ['Kitchen', 'Free Wi-Fi', 'Housekeeping'])
  assert.deepEqual(roomAmenityList(null), [])
})
