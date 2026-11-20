// chooseAccountType (US 2.4.2): the choice screen's save. The viewer, the RPC, cookies and Next are mocked.
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

let viewer
let saveResult
let rereadResult
const setAccountType = mock.fn(async () => saveResult)
const getAccountType = mock.fn(async () => rereadResult)
const cookieSet = mock.fn()
const revalidatePath = mock.fn()
const redirect = mock.fn((url) => {
  throw Object.assign(new Error('NEXT_REDIRECT'), { url })
})

mock.module('@/utils/viewer', { namedExports: { getViewer: async () => viewer } })
mock.module('@/utils/accounts', { namedExports: { setAccountType, getAccountType } })
mock.module('next/headers', { namedExports: { cookies: async () => ({ set: cookieSet, get: () => undefined }) } })
mock.module('next/navigation', { namedExports: { redirect } })
mock.module('next/cache', { namedExports: { revalidatePath } })

const { chooseAccountType } = await import('../app/account-type/actions.ts')

const form = (type, next) => {
  const f = new FormData()
  if (type !== undefined) f.set('type', type)
  if (next !== undefined) f.set('next', next)
  return f
}
async function redirectOf(promise) {
  const err = await promise.then(
    () => assert.fail('expected a redirect'),
    (e) => e,
  )
  assert.equal(err.message, 'NEXT_REDIRECT')
  return err.url
}
const TRY_AGAIN = { message: "We couldn't save that. Try again." }
const p0001 = { data: null, error: { code: 'P0001', message: 'already set' } }

const oldEnv = process.env.NODE_ENV
beforeEach(() => {
  viewer = { role: 'unchosen', userId: 'user-1', devRole: null, realType: null }
  saveResult = { data: 'personal', error: null }
  rereadResult = { data: null, error: null }
  for (const m of [setAccountType, getAccountType, cookieSet, revalidatePath, redirect]) m.mock.resetCalls()
})
afterEach(() => {
  process.env.NODE_ENV = oldEnv
})

describe('chooseAccountType', () => {
  test('a type that is not personal or business is refused, nothing written', async () => {
    assert.deepEqual(await chooseAccountType(null, form('admin', '/x')), { message: 'Choose Personal or Business.' })
    assert.equal(setAccountType.mock.callCount(), 0)
    assert.equal(cookieSet.mock.callCount(), 0)
  })

  test('signed out goes to sign-in, coming back to the choice screen', async () => {
    viewer = { role: 'signed-out', userId: null, devRole: null, realType: null }
    const url = await redirectOf(chooseAccountType(null, form('personal', '/listings')))
    assert.equal(url, '/auth/login?next=' + encodeURIComponent('/account-type?next=%2Flistings'))
    assert.equal(setAccountType.mock.callCount(), 0)
  })

  test('with the dev override the choice goes in the cookie, never the database', async () => {
    viewer = { ...viewer, devRole: 'unchosen' }
    const url = await redirectOf(chooseAccountType(null, form('business', '/listings/new')))
    // The stored type is still empty, so route access would bounce /listings/new back here
    assert.equal(url, '/')
    assert.equal(setAccountType.mock.callCount(), 0)
    assert.equal(cookieSet.mock.calls[0].arguments[0], 'lh_dev_role')
    assert.equal(cookieSet.mock.calls[0].arguments[1], 'business')
    assert.deepEqual(revalidatePath.mock.calls[0].arguments, ['/', 'layout'])
  })

  test('with the dev override matching the stored type, next is followed', async () => {
    viewer = { ...viewer, devRole: 'business', realType: 'business' }
    const url = await redirectOf(chooseAccountType(null, form('business', '/listings/new')))
    assert.equal(url, '/listings/new')
  })

  test('in production (no override from the viewer) it saves for real and writes no cookie', async () => {
    process.env.NODE_ENV = 'production'
    await redirectOf(chooseAccountType(null, form('personal', '/search')))
    assert.deepEqual(setAccountType.mock.calls[0].arguments, ['personal'])
    assert.equal(cookieSet.mock.callCount(), 0)
  })

  test('saved: an unsafe next ends at home, a safe one is kept', async () => {
    assert.equal(await redirectOf(chooseAccountType(null, form('personal', '//x.com'))), '/')
    assert.equal(await redirectOf(chooseAccountType(null, form('personal', '/search?city=sf'))), '/search?city=sf')
    assert.equal(revalidatePath.mock.callCount(), 2)
  })

  test('already set to the same type continues quietly', async () => {
    saveResult = p0001
    rereadResult = { data: 'personal', error: null }
    assert.equal(await redirectOf(chooseAccountType(null, form('personal', '/search'))), '/search')
    assert.deepEqual(getAccountType.mock.calls[0].arguments, ['user-1'])
  })

  test('already set to the other type says so and offers the way on', async () => {
    saveResult = p0001
    rereadResult = { data: 'personal', error: null }
    assert.deepEqual(await chooseAccountType(null, form('business', '/listings')), {
      message: 'Your account is already set to Personal.',
      continueHref: '/',
    })
    assert.equal(revalidatePath.mock.callCount(), 0)
  })

  test('already set but the re-read fails or comes back empty', async () => {
    saveResult = p0001
    rereadResult = { data: null, error: { message: 'down' } }
    assert.deepEqual(await chooseAccountType(null, form('business', '/x')), TRY_AGAIN)
    rereadResult = { data: null, error: null }
    assert.deepEqual(await chooseAccountType(null, form('business', '/x')), TRY_AGAIN)
  })

  test('no accounts row', async () => {
    saveResult = { data: null, error: { code: 'P0002', message: 'no row' } }
    assert.deepEqual(await chooseAccountType(null, form('business', '/x')), {
      message: "We couldn't find your account. Sign out and sign in again.",
    })
  })

  test('any other error', async () => {
    saveResult = { data: null, error: { code: '42501', message: 'nope' } }
    assert.deepEqual(await chooseAccountType(null, form('business', '/x')), TRY_AGAIN)
  })

  test('an error with an empty code is a failure: nothing is redirected or revalidated', async () => {
    saveResult = { data: null, error: { code: '', message: 'connection closed' } }
    assert.deepEqual(await chooseAccountType(null, form('personal', '/search')), TRY_AGAIN)
    assert.equal(redirect.mock.callCount(), 0)
    assert.equal(revalidatePath.mock.callCount(), 0)
  })
})
