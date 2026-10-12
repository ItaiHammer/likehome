import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchingRoom, readRoomFilters, roomAmenityList, searchQuery, stayOffers } from '../lib/stay-filters.ts'
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

const room = (id, nightly, more = {}) => ({ id, nightly, sleeps: 2, beds: 1, bedSize: 'Queen', tags: [], ...more })
const filters = (more = {}) => ({ guests: 2, tags: [], ...more })

test('the stay opens on the cheapest room that passes the search, as search_hotels matched it', () => {
  const rooms = [room('suite', 300, { tags: ['Kitchen'], sleeps: 4, beds: 2, bedSize: 'King' }), room('basic', 90), room('studio', 150, { tags: ['Kitchen'] })]
  assert.equal(matchingRoom(rooms, [], filters()).id, 'basic')
  // A room tag must be on that same room; a hotel tag counts for every room
  assert.equal(matchingRoom(rooms, [], filters({ tags: ['Kitchen'] })).id, 'studio')
  assert.equal(matchingRoom(rooms, ['Pool'], filters({ tags: ['Pool'] })).id, 'basic')
  assert.equal(matchingRoom(rooms, [], filters({ guests: 3 })).id, 'suite')
  assert.equal(matchingRoom(rooms, [], filters({ minPrice: 100 })).id, 'studio')
  assert.equal(matchingRoom(rooms, [], filters({ maxPrice: 89 })), null)
  assert.equal(matchingRoom(rooms, [], filters({ numBeds: 2 })).id, 'suite')
  assert.equal(matchingRoom(rooms, [], filters({ bedSize: 'King' })).id, 'suite')
  assert.equal(matchingRoom([room('gone', 50, { soldOut: true }), room('open', 80)], [], filters()).id, 'open')
})

test('filter values the search ignores don’t narrow the rooms', () => {
  const f = readRoomFilters({ minPrice: '100abc', maxPrice: '$500', numBeds: '0', bedSize: 'Huge', tags: ['Kitchen', 'Moat'] }, 3)
  assert.deepEqual(f, { guests: 3, minPrice: undefined, maxPrice: undefined, numBeds: undefined, bedSize: undefined, tags: ['Kitchen'] })
  assert.deepEqual(readRoomFilters({ minPrice: '80', maxPrice: '200.5', numBeds: '2', bedSize: 'Twin XL', tags: 'Pool' }, 2), {
    guests: 2,
    minPrice: 80,
    maxPrice: 200.5,
    numBeds: 2,
    bedSize: 'Twin XL',
    tags: ['Pool'],
  })
})

test('a result links to its stay with the search, and only the search', () => {
  assert.equal(
    searchQuery({ where: 'Honolulu', adults: '2', tags: ['Kitchen', 'Pool'], room: 'abc', aiReply: 'Here you go', page: '2', checkIn: '' }),
    'where=Honolulu&adults=2&tags=Kitchen&tags=Pool&page=2',
  )
  assert.equal(searchQuery({}), '')
})
