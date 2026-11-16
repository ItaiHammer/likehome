// US1.1.5 — saved hotels (heart on search cards, Saved hotels in My Bookings)
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// A minimal browser: localStorage + window events, enough for lib/saved-hotels.ts
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
globalThis.window = new EventTarget()

const { parseSavedIds, toggleId, getSavedIds, getServerSavedIds, subscribeSavedIds, toggleSavedHotel } = await import(
  '../lib/saved-hotels.ts'
)
const KEY = 'likehome_saved_hotels'

beforeEach(() => store.clear())

test('reads a stored list of ids', () => {
  assert.deepEqual(parseSavedIds('["a","b"]'), ['a', 'b'])
})

test('broken or unexpected data counts as nothing saved instead of crashing the page', () => {
  for (const raw of [null, '', 'not json', '{"a":1}', '"a"', 'null', '42']) {
    assert.deepEqual(parseSavedIds(raw), [], `raw=${raw}`)
  }
})

test('numeric ids from older saves become strings; other junk and repeats are dropped', () => {
  assert.deepEqual(parseSavedIds('[1, "1", "b", null, {"x":1}, true, "b"]'), ['1', 'b'])
})

test('toggling adds a new hotel at the end and removes a saved one', () => {
  assert.deepEqual(toggleId(['a'], 'b'), ['a', 'b'])
  assert.deepEqual(toggleId(['a', 'b'], 'a'), ['b'])
})

test('the snapshot is the same array until the stored value changes (useSyncExternalStore needs this)', () => {
  store.set(KEY, '["a"]')
  const first = getSavedIds()
  assert.equal(getSavedIds(), first)
  store.set(KEY, '["a","b"]')
  assert.notEqual(getSavedIds(), first)
  assert.deepEqual(getSavedIds(), ['a', 'b'])
})

test('the server renders nothing saved', () => {
  assert.deepEqual(getServerSavedIds(), [])
})

test('saving and unsaving persists and notifies subscribers', () => {
  let calls = 0
  const unsubscribe = subscribeSavedIds(() => calls++)
  toggleSavedHotel('h1')
  assert.equal(store.get(KEY), '["h1"]')
  toggleSavedHotel('h1')
  assert.equal(store.get(KEY), '[]')
  assert.equal(calls, 2)
  unsubscribe()
  toggleSavedHotel('h2')
  assert.equal(calls, 2, 'no calls after unsubscribing')
})

test('a save in another tab updates this one; unrelated keys are ignored', () => {
  let calls = 0
  const unsubscribe = subscribeSavedIds(() => calls++)
  const storageEvent = (key) => Object.assign(new Event('storage'), { key })
  window.dispatchEvent(storageEvent(KEY))
  window.dispatchEvent(storageEvent('theme'))
  window.dispatchEvent(storageEvent(null)) // localStorage.clear() in another tab
  assert.equal(calls, 2)
  unsubscribe()
})

test('blocked storage (private mode) reads as empty and saving does nothing', () => {
  const real = globalThis.localStorage
  globalThis.localStorage = {
    getItem() { throw new Error('SecurityError') },
    setItem() { throw new Error('SecurityError') },
  }
  try {
    assert.deepEqual(getSavedIds(), [])
    assert.doesNotThrow(() => toggleSavedHotel('h1'))
  } finally {
    globalThis.localStorage = real
  }
})
