import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchingRoom, roomFits, originalSearch, readRoomFilters, roomAmenityList, searchQuery, stayOffers } from '../lib/stay-filters.ts'
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

test('the stay room fits the adults and children on their own, skipping limits a room doesn’t have', () => {
  const rooms = [
    room('adults', 100, { sleeps: 4, maxAdults: 4, maxChildren: 0 }),
    room('unknown', 150, { sleeps: 4, maxAdults: null, maxChildren: null }),
    room('family', 200, { sleeps: 4, maxAdults: 2, maxChildren: 3 }),
  ]
  assert.equal(matchingRoom(rooms, [], filters({ guests: 4 })).id, 'adults')
  assert.equal(matchingRoom(rooms, [], filters({ guests: 4, adults: 2, children: 2 })).id, 'unknown')
  assert.equal(matchingRoom([rooms[0], rooms[2]], [], filters({ guests: 4, adults: 2, children: 2 })).id, 'family')
  assert.equal(matchingRoom(rooms, [], filters({ guests: 3, adults: 3 })).id, 'adults')
  assert.equal(matchingRoom([rooms[2]], [], filters({ guests: 3, adults: 3 })), null)
  assert.equal(matchingRoom([room('owner', 90, { sleeps: 4 })], [], filters({ guests: 4, adults: 1, children: 3 })).id, 'owner')
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
  // Adults and children only when the page passes them, as the search only sends them when given
  assert.deepEqual(readRoomFilters({}, 4, { adults: 2, children: 2 }), {
    guests: 4, adults: 2, children: 2, minPrice: undefined, maxPrice: undefined, numBeds: undefined, bedSize: undefined, tags: [],
  })
  assert.ok(!('adults' in readRoomFilters({}, 2)) && !('children' in readRoomFilters({}, 2)))
  // The search drops a reversed range entirely, so it doesn't narrow the rooms here either
  const reversed = readRoomFilters({ minPrice: '300', maxPrice: '100' }, 2)
  assert.equal(reversed.minPrice, undefined)
  assert.equal(reversed.maxPrice, undefined)
})

test('a result links to its stay with the search, and only the search', () => {
  assert.equal(
    searchQuery({ where: 'Honolulu', adults: '2', tags: ['Kitchen', 'Pool'], room: 'abc', aiReply: 'Here you go', page: '2', checkIn: '' }),
    'where=Honolulu&adults=2&tags=Kitchen&tags=Pool&page=2',
  )
  assert.equal(searchQuery({}), '')
})

test('Back to stays keeps the original search through sign-in', () => {
  const search = 'where=Honolulu&adults=2&tags=Kitchen&tags=Pool&page=2'
  // Coming back from sign-in: the card's own guests and dates sit on top, the search in `from`
  assert.equal(originalSearch({ room: 'r1', adults: '4', checkIn: '2026-11-01', checkOut: '2026-11-05', from: search }), search)
  // Straight from a result, the stay link's own keys are the search
  assert.equal(originalSearch({ where: 'Honolulu', adults: '2' }), 'where=Honolulu&adults=2')
  // Only search keys survive, so `from` can't put anything else into the link
  assert.equal(originalSearch({ from: 'next=https://evil.example&where=Paris' }), 'where=Paris')
})

test('roomFits goes by what the room sleeps and, where it lists them, its own adult and child limits', () => {
  // Villa Fontaine's Superior Queen: 2 adults, no children
  const queen = { nightly: 150, sleeps: 2, maxAdults: 2, maxChildren: 0 }
  assert.equal(roomFits(queen, 2, 2, 0), true)
  assert.equal(roomFits(queen, 3, 2, 1), false)
  assert.equal(roomFits({ ...queen, sleeps: 3 }, 3, 2, 1), false, 'no room for a child')
  assert.equal(roomFits({ nightly: 150, sleeps: 3, maxAdults: null, maxChildren: null }, 3, 2, 1), true, 'no limits listed')
  assert.equal(roomFits({ ...queen, sleeps: 3 }, 3), true, 'only the head count when the split is unknown')
})
