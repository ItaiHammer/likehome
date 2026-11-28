import { register } from 'node:module'
import { mock, test } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(s, c, next) {
    if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
    return next(s, c)
  }
`))
let authChange
let watches = 0
mock.module('@/utils/supabase/client', { namedExports: {
  createClient: () => ({ auth: { onAuthStateChange(callback) { authChange = callback; watches++; return {} } } }),
} })
const { getAccountSnapshot, subscribeAccount, UNKNOWN_ACCOUNT } = await import('../app/_components/accountChange.ts')
const report = (id) => authChange(id ? 'SIGNED_IN' : 'SIGNED_OUT', id ? { user: { id } } : null)

test('identity subscribers hear the initial session, signout and rapid A -> B -> A changes', () => {
  assert.equal(getAccountSnapshot(), UNKNOWN_ACCOUNT)
  const seen = []
  const stop = subscribeAccount(() => seen.push(getAccountSnapshot()))
  report('A')
  assert.deepEqual(seen, [{ accountId: 'A', version: 0 }])
  const first = getAccountSnapshot()
  report('A') // Token refresh/focus events do not clear the same account's inbox.
  assert.equal(getAccountSnapshot(), first)
  report('B')
  report('A')
  assert.deepEqual(seen.slice(-2), [{ accountId: 'B', version: 1 }, { accountId: 'A', version: 2 }])
  report(null)
  assert.deepEqual(getAccountSnapshot(), { accountId: null, version: 3 })
  stop()
  report('B')
  assert.equal(seen.length, 4)
  assert.equal(watches, 1)

  const late = []
  const stopLate = subscribeAccount(() => late.push(getAccountSnapshot()))
  assert.deepEqual(late, [{ accountId: 'B', version: 4 }])
  stopLate()
})
