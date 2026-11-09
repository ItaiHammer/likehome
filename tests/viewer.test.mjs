// getViewer (US 2.4.2): one session check and one accounts read per render; Supabase and cookies are mocked.
import { register } from 'node:module'
import { test, mock, beforeEach, afterEach, describe } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      if (s === 'next/headers' || s === 'next/navigation' || s === 'next/cache') return next(s + '.js', c)
      return next(s, c)
    }`)
)

let cookieValue
let claimsResult
let rowResult
const selects = []
const consoleError = mock.method(console, 'error', () => {})

mock.module('next/headers', {
  namedExports: {
    cookies: async () => ({
      get: (n) => (n === 'lh_dev_role' && cookieValue !== undefined ? { value: cookieValue } : undefined),
      getAll: () => [],
    }),
  },
})
mock.module('@/utils/supabase/server', {
  namedExports: {
    createClient: () => ({
      auth: { getClaims: async () => claimsResult },
      from: (table) => ({
        select: (cols) => ({
          eq: (col, id) => ({
            maybeSingle: async () => {
              selects.push({ table, cols, col, id })
              return rowResult
            },
          }),
        }),
      }),
    }),
  },
})

const { getViewer } = await import('../utils/viewer.ts')

const signedIn = (extra = {}) => ({ data: { claims: { sub: 'user-1', email: 'ada@example.com', ...extra } }, error: null })
const row = (account_type, full_name = 'Ada Lovelace') => ({ data: { account_type, full_name }, error: null })

const oldEnv = process.env.NODE_ENV
beforeEach(() => {
  cookieValue = undefined
  claimsResult = signedIn()
  rowResult = row(null)
  selects.length = 0
  consoleError.mock.resetCalls()
  process.env.NODE_ENV = 'test'
})
afterEach(() => {
  process.env.NODE_ENV = oldEnv
})

const SIGNED_OUT = { role: 'signed-out', userId: null, name: null, email: null, realType: null, devRole: null }

describe('getViewer', () => {
  test('a session error or a token without sub is signed out, with no account read', async () => {
    claimsResult = { data: null, error: { message: 'bad jwt' } }
    assert.deepEqual(await getViewer(), SIGNED_OUT)
    claimsResult = { data: { claims: { email: 'x@y.z' } }, error: null }
    assert.deepEqual(await getViewer(), SIGNED_OUT)
    assert.equal(selects.length, 0)
  })

  test('no type yet is unchosen, and the read is one select on the right row', async () => {
    assert.deepEqual(await getViewer(), {
      role: 'unchosen', userId: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', realType: null, devRole: null,
    })
    assert.deepEqual(selects, [{ table: 'accounts', cols: 'account_type, full_name', col: 'id', id: 'user-1' }])
  })

  test('no accounts row is unchosen', async () => {
    rowResult = { data: null, error: null }
    assert.equal((await getViewer()).role, 'unchosen')
  })

  test('a failed read is personal and logged', async () => {
    rowResult = { data: null, error: { message: 'down' } }
    const v = await getViewer()
    assert.equal(v.role, 'personal')
    assert.equal(v.realType, null)
    assert.equal(consoleError.mock.callCount(), 1)
  })

  test('the stored type is the role', async () => {
    rowResult = row('business')
    const v = await getViewer()
    assert.equal(v.role, 'business')
    assert.equal(v.realType, 'business')
  })

  test('name falls back from the row to the token, then to null', async () => {
    rowResult = row(null, '   ')
    claimsResult = signedIn({ user_metadata: { full_name: 'Tok Name' } })
    assert.equal((await getViewer()).name, 'Tok Name')
    rowResult = row(null, null)
    claimsResult = signedIn({ user_metadata: { full_name: '', name: 'Nick' } })
    assert.equal((await getViewer()).name, 'Nick')
    claimsResult = signedIn({ user_metadata: { full_name: ' ', name: '' } })
    assert.equal((await getViewer()).name, null)
  })

  test('email only when the token has a string email', async () => {
    claimsResult = signedIn({ email: 42 })
    assert.equal((await getViewer()).email, null)
  })

  test('in development the override is the role, the stored type is still read', async () => {
    process.env.NODE_ENV = 'development'
    cookieValue = 'business'
    rowResult = row('personal')
    const v = await getViewer()
    assert.equal(v.role, 'business')
    assert.equal(v.devRole, 'business')
    assert.equal(v.realType, 'personal')
    assert.equal(selects.length, 1)
  })

  test('in development the override holds even when the read fails', async () => {
    process.env.NODE_ENV = 'development'
    cookieValue = 'personal'
    rowResult = { data: null, error: { message: 'down' } }
    const v = await getViewer()
    assert.equal(v.role, 'personal')
    assert.equal(v.realType, null)
  })

  for (const env of ['production', 'test']) {
    test(`with NODE_ENV=${env} the cookie is ignored`, async () => {
      process.env.NODE_ENV = env
      cookieValue = 'business'
      rowResult = row('personal')
      const v = await getViewer()
      assert.equal(v.role, 'personal')
      assert.equal(v.devRole, null)
    })
  }
})
