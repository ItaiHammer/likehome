// Tests for lib/recent-searches.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  RECENT_SEARCHES_KEY,
  addRecentSearch,
  datesLabel,
  loadRecentSearches,
  parseRecentSearches,
  readSearchFields,
  saveRecentSearch,
  searchDetails,
} = await import('../lib/recent-searches.ts')

const TODAY = '2026-11-20'
const form = (fields) => new URLSearchParams(fields)

function memoryStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[RECENT_SEARCHES_KEY, initial]])
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  }
}

test('readSearchFields: the bar’s form, trimmed, with guests as numbers', () => {
  assert.deepEqual(
    readSearchFields(form({ where: '  San Diego,  California ', place: 'ChIJ1', checkIn: '2026-12-03', checkOut: '2026-12-06', adults: '3', children: '1', tz: 'America/Los_Angeles' })),
    { where: 'San Diego, California', place: 'ChIJ1', checkIn: '2026-12-03', checkOut: '2026-12-06', adults: 3, children: 1 },
  )
})

test('readSearchFields: blanks and junk fall back to the bar’s defaults', () => {
  assert.deepEqual(readSearchFields(form({ where: '', place: '', checkIn: '', checkOut: '', adults: '', children: 'x' })), {
    where: '',
    adults: 2,
    children: 0,
  })
  assert.deepEqual(readSearchFields(new URLSearchParams()), { where: '', adults: 2, children: 0 })
})

test('readSearchFields: guests are kept inside the picker’s limits', () => {
  const fields = readSearchFields(form({ where: 'Paris', adults: '40', children: '-3' }))
  assert.equal(fields.adults, 16)
  assert.equal(fields.children, 0)
  assert.equal(readSearchFields(form({ where: 'Paris', adults: '0' })).adults, 1)
  assert.equal(readSearchFields(form({ where: 'Paris', adults: '2.5' })).adults, 2)
})

test('readSearchFields: impossible dates and a check-out not after check-in are dropped', () => {
  assert.deepEqual(readSearchFields(form({ where: 'Paris', checkIn: '2026-02-30', checkOut: '2026-03-02' })), { where: 'Paris', adults: 2, children: 0 })
  assert.deepEqual(readSearchFields(form({ where: 'Paris', checkIn: '2026-12-03', checkOut: '2026-12-03' })), {
    where: 'Paris',
    checkIn: '2026-12-03',
    adults: 2,
    children: 0,
  })
  // A lone check-out (the calendar allows picking it first) has nothing to count from
  assert.deepEqual(readSearchFields(form({ where: 'Paris', checkOut: '2026-12-03' })), { where: 'Paris', adults: 2, children: 0 })
})

test('readSearchFields: also reads FormData', () => {
  const data = new FormData()
  data.set('where', 'Tokyo')
  data.set('adults', '1')
  data.set('children', '0')
  assert.deepEqual(readSearchFields(data), { where: 'Tokyo', adults: 1, children: 0 })
})

test('searchDetails: dates and guests in one line', () => {
  assert.equal(searchDetails({ checkIn: '2026-12-03', checkOut: '2026-12-06', adults: 2, children: 0 }), 'Dec 3 - Dec 6 · 2 guests')
  assert.equal(searchDetails({ adults: 2, children: 1 }), 'Any dates · 3 guests')
  assert.equal(searchDetails({ adults: 1, children: 0 }), 'Any dates · 1 guest')
  assert.equal(searchDetails({ checkIn: '2026-12-03', adults: 2, children: 0 }), 'Dec 3 - Add check-out · 2 guests')
})

test('datesLabel: the dates field’s text, empty with no dates', () => {
  assert.equal(datesLabel('2026-12-03', '2026-12-06'), 'Dec 3 - Dec 6')
  assert.equal(datesLabel('2026-12-03', ''), 'Dec 3 - Add check-out')
  assert.equal(datesLabel('', ''), '')
})

test('addRecentSearch: newest first, at most three', () => {
  let list = []
  for (const where of ['Paris', 'Rome', 'Tokyo', 'Lima']) list = addRecentSearch(list, readSearchFields(form({ where })), TODAY)
  assert.deepEqual(
    list.map((s) => s.where),
    ['Lima', 'Tokyo', 'Rome'],
  )
})

test('addRecentSearch: the same search again moves to the top instead of repeating', () => {
  let list = []
  for (const where of ['Paris', 'Rome', 'paris']) list = addRecentSearch(list, readSearchFields(form({ where })), TODAY)
  assert.deepEqual(
    list.map((s) => s.where),
    ['paris', 'Rome'],
  )
})

test('addRecentSearch: the same place with other dates or guests is its own search', () => {
  let list = []
  list = addRecentSearch(list, readSearchFields(form({ where: 'Paris', checkIn: '2026-12-03', checkOut: '2026-12-06' })), TODAY)
  list = addRecentSearch(list, readSearchFields(form({ where: 'Paris', checkIn: '2026-12-10', checkOut: '2026-12-12' })), TODAY)
  list = addRecentSearch(list, readSearchFields(form({ where: 'Paris', checkIn: '2026-12-10', checkOut: '2026-12-12', adults: '4' })), TODAY)
  assert.equal(list.length, 3)
})

test('addRecentSearch: a search with no place is not kept', () => {
  const list = [{ where: 'Rome', adults: 2, children: 0 }]
  assert.equal(addRecentSearch(list, readSearchFields(form({ where: '   ', adults: '3' })), TODAY), list)
})

test('addRecentSearch: a lone check-in is kept as a place without dates', () => {
  const [search] = addRecentSearch([], readSearchFields(form({ where: 'Rome', checkIn: '2026-12-03' })), TODAY)
  assert.deepEqual(search, { where: 'Rome', adults: 2, children: 0 })
})

test('parseRecentSearches: dates already in the past are dropped, the place is kept', () => {
  const raw = JSON.stringify([
    { where: 'San Diego', checkIn: '2026-11-10', checkOut: '2026-11-12', adults: 2, children: 0 },
    { where: 'Paris', checkIn: TODAY, checkOut: '2026-11-22', adults: 2, children: 0 },
  ])
  assert.deepEqual(parseRecentSearches(raw, TODAY), [
    { where: 'San Diego', adults: 2, children: 0 },
    { where: 'Paris', checkIn: TODAY, checkOut: '2026-11-22', adults: 2, children: 0 },
  ])
})

test('parseRecentSearches: searches that only differed by their past dates become one', () => {
  const raw = JSON.stringify([
    { where: 'Rome', checkIn: '2026-10-01', checkOut: '2026-10-03', adults: 2, children: 0 },
    { where: 'Rome', checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0 },
    { where: 'Oslo', adults: 2, children: 0 },
  ])
  assert.deepEqual(
    parseRecentSearches(raw, TODAY).map((s) => s.where),
    ['Rome', 'Oslo'],
  )
})

test('parseRecentSearches: junk reads as nothing, bad entries are skipped', () => {
  for (const raw of [null, '', 'not json', '{}', '"Paris"', '42']) assert.deepEqual(parseRecentSearches(raw, TODAY), [], String(raw))
  const raw = JSON.stringify([null, 'Paris', { where: '' }, { where: 7 }, { where: 'Oslo', adults: 'lots', place: 9 }])
  assert.deepEqual(parseRecentSearches(raw, TODAY), [{ where: 'Oslo', adults: 2, children: 0 }])
})

test('save then load: the form round-trips through storage', () => {
  const storage = memoryStorage()
  saveRecentSearch(readSearchFields(form({ where: 'Kyoto', place: 'p1', checkIn: '2026-12-03', checkOut: '2026-12-06', adults: '2', children: '1' })), TODAY, storage)
  saveRecentSearch(readSearchFields(form({ where: 'Banff' })), TODAY, storage)
  assert.deepEqual(loadRecentSearches(TODAY, storage), [
    { where: 'Banff', adults: 2, children: 0 },
    { where: 'Kyoto', place: 'p1', checkIn: '2026-12-03', checkOut: '2026-12-06', adults: 2, children: 1 },
  ])
})

test('save: a search with no place leaves storage untouched', () => {
  const storage = memoryStorage()
  saveRecentSearch(readSearchFields(form({ where: '' })), TODAY, storage)
  assert.equal(storage.data.size, 0)
})

test('storage errors are swallowed', () => {
  const broken = {
    getItem: () => {
      throw new Error('SecurityError')
    },
    setItem: () => {
      throw new Error('QuotaExceededError')
    },
  }
  assert.deepEqual(loadRecentSearches(TODAY, broken), [])
  assert.doesNotThrow(() => saveRecentSearch(readSearchFields(form({ where: 'Paris' })), TODAY, broken))
  assert.deepEqual(loadRecentSearches(TODAY, null), [])
  assert.doesNotThrow(() => saveRecentSearch(readSearchFields(form({ where: 'Paris' })), TODAY, null))
})
