// Tests for the saved hotels store in lib/saved-hotels.ts. Run with `npm test`. The server and browser storage are faked.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { createSavedHotelsStore, mergeLoaded, shownSaved, LEGACY_SAVED_KEY } = await import('../lib/saved-hotels.ts')

const A = '6f1c2b0e-3a4d-4e5f-8a9b-0c1d2e3f4a5b'
const B = 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d'
const C = '11111111-2222-4333-8444-555555555555'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const answer = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => ({ data }) })
const tick = () => new Promise((r) => setTimeout(r, 0))

// Every request waits until the test answers it, so the order of answers is up to the test
function fakeServer({ stored } = {}) {
  const lists = []
  const sends = []
  const storage = new Map(stored === undefined ? [] : [[LEGACY_SAVED_KEY, stored]])
  const store = createSavedHotelsStore({
    list: () => {
      const d = deferred()
      lists.push(d)
      return d.promise
    },
    send: (method, hotelId) => {
      const d = deferred()
      sends.push({ method, hotelId, ...d })
      return d.promise
    },
    storage: () => ({
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    }),
  })
  return { store, lists, sends, storage }
}

const ids = (store) => [...store.getState().ids].sort()

test('mergeLoaded lays toggles over the list in order, later maps winning', () => {
  const done = new Map([[A, false], [C, true]])
  const pending = new Map([[C, false], [B, true]])
  assert.deepEqual([...mergeLoaded([A, B], done, pending)].sort(), [B].sort())
  assert.deepEqual([...mergeLoaded([A])].sort(), [A])
})

test('shownSaved uses the server answer only until the store knows the hotel', () => {
  const loading = { status: 'loading', ids: new Set([A]), listed: false, known: new Set([A, B]) }
  assert.equal(shownSaved(loading, A, false), true)
  assert.equal(shownSaved(loading, B, true), false)
  assert.equal(shownSaved(loading, C, true), true)
  assert.equal(shownSaved({ ...loading, status: 'error' }, C, true), true)
  const listed = { status: 'signed-in', ids: new Set([A]), listed: true, known: new Set() }
  assert.equal(shownSaved(listed, C, true), false)
  for (const status of ['signed-out', 'unavailable']) assert.equal(shownSaved({ ...listed, status }, A, true), false)
})

test('a loaded list keeps toggles still on their way and ones done since the read started', async () => {
  const { store, lists, sends } = fakeServer()
  store.load('/a')
  const saving = store.toggle(B, false)
  const removing = store.toggle(C, true)
  sends[1].resolve(answer(200))
  assert.equal(await removing, 'removed')
  lists[0].resolve(answer(200, [A, C]))
  await tick()
  assert.equal(store.getState().status, 'signed-in')
  assert.deepEqual(ids(store), [A, B].sort())
  sends[0].resolve(answer(200))
  assert.equal(await saving, 'saved')
  assert.deepEqual(ids(store), [A, B].sort())
})

test('a second tap while the first is on its way is busy and sends nothing', async () => {
  const { store, sends } = fakeServer()
  const first = store.toggle(A, false)
  assert.equal(await store.toggle(A, true), 'busy')
  assert.equal(sends.length, 1)
  sends[0].resolve(answer(200))
  assert.equal(await first, 'saved')
  const again = store.toggle(A)
  assert.equal(sends[1].method, 'DELETE')
  sends[1].resolve(answer(200))
  assert.equal(await again, 'removed')
})

test('a failed toggle puts the heart back and announces it', async () => {
  const { store, lists, sends } = fakeServer()
  store.load('/a')
  lists[0].resolve(answer(200, [A]))
  await tick()
  const removing = store.toggle(A)
  assert.deepEqual(ids(store), [])
  sends[0].reject(new Error('offline'))
  assert.equal(await removing, 'failed')
  assert.deepEqual(ids(store), [A])
  assert.equal(store.getFailure().message, "Couldn't remove this hotel from your saved hotels. Try again.")
  const saving = store.toggle(B)
  sends[1].resolve(answer(500))
  assert.equal(await saving, 'failed')
  assert.equal(shownSaved(store.getState(), B, true), false)
  assert.equal(store.getFailure().n, 2)
})

test('a failed save clears its warning after the same save is acknowledged, and later errors get new keys', async () => {
  const { store, sends } = fakeServer()
  const failed = store.toggle(A, false)
  sends[0].resolve(answer(500))
  assert.equal(await failed, 'failed')
  const firstKey = store.getFailure().n

  const retry = store.toggle(A, false)
  assert.equal(store.getFailure().n, firstKey) // Keep it while the retry is still pending.
  sends[1].resolve(answer(200))
  assert.equal(await retry, 'saved')
  assert.equal(store.getFailure(), null)
  assert.deepEqual(ids(store), [A])

  const later = store.toggle(B, false)
  sends[2].resolve(answer(500))
  assert.equal(await later, 'failed')
  assert.ok(store.getFailure().n > firstKey)
})

test('a failed removal clears its warning when the same removal succeeds', async () => {
  const { store, sends } = fakeServer()
  const failed = store.toggle(A, true)
  sends[0].resolve(answer(500))
  assert.equal(await failed, 'failed')
  assert.match(store.getFailure().message, /remove/)
  const retry = store.toggle(A, true)
  sends[1].resolve(answer(200))
  assert.equal(await retry, 'removed')
  assert.equal(store.getFailure(), null)
  assert.deepEqual(ids(store), [])
})

test('a successful action on another hotel or in the opposite direction does not clear the failed action', async () => {
  const { store, sends } = fakeServer()
  const failed = store.toggle(A, false)
  sends[0].resolve(answer(500))
  await failed
  const warning = store.getFailure()
  const other = store.toggle(B, false)
  sends[1].resolve(answer(200))
  await other
  assert.equal(store.getFailure(), warning)
  const opposite = store.toggle(A, true)
  sends[2].resolve(answer(200))
  await opposite
  assert.equal(store.getFailure(), warning)
})

test('an older retry success does not erase a newer failure from another hotel', async () => {
  const { store, sends } = fakeServer()
  const failed = store.toggle(A, false)
  sends[0].resolve(answer(500))
  await failed
  const retry = store.toggle(A, false)
  const other = store.toggle(B, false)
  sends[2].resolve(answer(500))
  await other
  const latest = store.getFailure()
  sends[1].resolve(answer(200))
  assert.equal(await retry, 'saved')
  assert.equal(store.getFailure(), latest)
})

test('switching accounts clears the old warning without reusing its dismissed key', async () => {
  const { store, sends } = fakeServer()
  const failed = store.toggle(A, false)
  sends[0].resolve(answer(500))
  await failed
  const dismissedKey = store.getFailure().n
  const oldRetry = store.toggle(A, false)
  store.accountChanged('another-account')
  assert.equal(store.getFailure(), null)
  const nextFailed = store.toggle(B, false)
  sends[2].resolve(answer(500))
  await nextFailed
  const nextWarning = store.getFailure()
  assert.ok(nextWarning.n > dismissedKey)
  sends[1].resolve(answer(200))
  await oldRetry
  assert.equal(store.getFailure(), nextWarning)
})

test('while loading or after the list failed, a tap shows at once and the next tap undoes it', async () => {
  const { store, lists, sends } = fakeServer()
  store.load('/a')
  const saving = store.toggle(A, shownSaved(store.getState(), A, false))
  assert.equal(shownSaved(store.getState(), A, false), true)
  sends[0].resolve(answer(200))
  await saving
  lists[0].resolve(answer(500))
  await tick()
  assert.equal(store.getState().status, 'error')
  assert.equal(shownSaved(store.getState(), A, false), true)
  const removing = store.toggle(A, shownSaved(store.getState(), A, false))
  assert.equal(sends[1].method, 'DELETE')
  assert.equal(shownSaved(store.getState(), A, true), false)
  sends[1].resolve(answer(200))
  assert.equal(await removing, 'removed')
})

test('answers for the old account are dropped after the account changes', async () => {
  const { store, lists, sends } = fakeServer()
  store.load('/a')
  const saving = store.toggle(A, false)
  store.accountChanged('user-2')
  assert.equal(store.getState().status, 'loading')
  assert.equal(lists.length, 2)
  lists[0].resolve(answer(200, [B]))
  sends[0].resolve(answer(500))
  assert.equal(await saving, 'failed')
  await tick()
  assert.equal(store.getState().status, 'loading')
  assert.deepEqual(ids(store), [])
  assert.equal(store.getFailure(), null)
  lists[1].resolve(answer(200, [C]))
  await tick()
  assert.deepEqual(ids(store), [C])
  store.accountChanged(null)
  assert.equal(store.getState().status, 'signed-out')
  assert.equal(lists.length, 2)
})

test('a 403 means hearts do not apply, and a later read failure does not bring them back', async () => {
  const { store, lists, sends } = fakeServer()
  store.load('/a')
  lists[0].resolve(answer(403))
  await tick()
  assert.equal(store.getState().status, 'unavailable')
  assert.equal(await store.toggle(A, false), 'unavailable')
  assert.equal(sends.length, 0)
  store.load('/b')
  lists[1].reject(new Error('offline'))
  await tick()
  assert.equal(store.getState().status, 'unavailable')
})

test('a toggle answered 401 or 403 signs out or hides the hearts', async () => {
  const { store, sends } = fakeServer()
  const first = store.toggle(A, false)
  sends[0].resolve(answer(401))
  assert.equal(await first, 'signed-out')
  assert.equal(store.getState().status, 'signed-out')
  store.accountChanged('user-2')
  const second = store.toggle(A, false)
  sends[1].resolve(answer(403))
  assert.equal(await second, 'unavailable')
  assert.equal(store.getState().status, 'unavailable')
})

test('old browser hearts are copied into a personal account once, then the key is cleared', async () => {
  const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([A, B, 'sunset-cabin']) })
  store.load('/a')
  lists[0].resolve(answer(200, [A]))
  await tick()
  assert.deepEqual(sends.map((s) => [s.method, s.hotelId]), [['POST', B]])
  sends[0].resolve(answer(200))
  await tick()
  assert.deepEqual(ids(store), [A, B].sort())
  assert.equal(storage.has(LEGACY_SAVED_KEY), false)
})

test('old browser hearts stay when the list is refused or a copy is refused', async () => {
  for (const status of [401, 403]) {
    const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([B]) })
    store.load('/a')
    lists[0].resolve(answer(status))
    await tick()
    assert.equal(sends.length, 0)
    assert.equal(storage.has(LEGACY_SAVED_KEY), true)
  }
  for (const status of [401, 403, 500]) {
    const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([B]) })
    store.load('/a')
    lists[0].resolve(answer(200, []))
    await tick()
    sends[0].resolve(answer(status))
    await tick()
    assert.deepEqual(ids(store), [])
    assert.equal(storage.has(LEGACY_SAVED_KEY), true)
  }
})

test('old browser hearts copied after the account changed leave the new list alone', async () => {
  const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([B]) })
  store.load('/a')
  lists[0].resolve(answer(200, []))
  await tick()
  store.accountChanged('user-2')
  sends[0].resolve(answer(200))
  await tick()
  assert.deepEqual(ids(store), [])
  assert.equal(storage.has(LEGACY_SAVED_KEY), false)
})

test('old browser hearts still on their way for one account are not sent again for the next', async () => {
  const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([B]) })
  store.load('/a')
  lists[0].resolve(answer(200, []))
  await tick()
  assert.equal(sends.length, 1)
  store.accountChanged('user-2')
  lists[1].resolve(answer(200, []))
  await tick()
  assert.equal(sends.length, 1)
  sends[0].resolve(answer(200))
  await tick()
  await tick()
  assert.equal(sends.length, 1)
  assert.equal(storage.has(LEGACY_SAVED_KEY), false)
})

test('the next account gets only the old hearts the last copy could not save', async () => {
  const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([A, B, C]) })
  store.load('/a')
  lists[0].resolve(answer(200, []))
  await tick()
  store.accountChanged('user-2')
  lists[1].resolve(answer(200, []))
  await tick()
  sends[0].resolve(answer(200))
  sends[1].resolve(answer(401))
  sends[2].resolve(answer(404))
  await tick()
  await tick()
  assert.deepEqual(sends.slice(3).map((s) => [s.method, s.hotelId]), [['POST', B]])
  assert.equal(storage.get(LEGACY_SAVED_KEY), JSON.stringify([B]))
  sends[3].resolve(answer(200))
  await tick()
  assert.equal(storage.has(LEGACY_SAVED_KEY), false)
  assert.deepEqual(ids(store), [B])
})

test('a partly failed copy keeps only the hotels that did not go through', async () => {
  const { store, lists, sends, storage } = fakeServer({ stored: JSON.stringify([A, B, C]) })
  store.load('/a')
  lists[0].resolve(answer(200, []))
  await tick()
  sends[0].resolve(answer(200))
  sends[1].resolve(answer(500))
  sends[2].resolve(answer(400))
  await tick()
  assert.equal(storage.get(LEGACY_SAVED_KEY), JSON.stringify([B]))
  assert.deepEqual(ids(store), [A])
})
