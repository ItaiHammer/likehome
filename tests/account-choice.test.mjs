// Account type choice rules (US 2.4.2): safe return paths, the gate's redirect, where to go after choosing.
import { register } from 'node:module'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      return next(s, c)
    }`)
)

const { safeNext, choicePathFor, choiceRedirect, afterChoicePath, parseAccountType, choiceOutcome } = await import(
  '../lib/account/choice.ts'
)

const TRY_AGAIN = "We couldn't save that. Try again."

test('safeNext refuses anything that is not a plain same-site path', () => {
  const bad = [
    null, 42, '', 'listings', '//x.com', '/\\x.com', '/\tx', '/\nx', '/ x', 'https://x.com/a',
    '/account-type', '/account-type?next=/x', '/api/auth/callback', '/auth/login',
    '/Account-Type', '/API/x', '/AUTH/login',
    '/account-type?next=/account-type?next=/x',
  ]
  for (const raw of bad) assert.equal(safeNext(raw), null, JSON.stringify(raw))
})

test('safeNext keeps the path and query of a same-site path', () => {
  assert.equal(safeNext('/listings/new?x=1'), '/listings/new?x=1')
  assert.equal(safeNext('/%2F%2Fevil.com'), '/%2F%2Fevil.com')
  assert.equal(safeNext('/MyBookings#top'), '/MyBookings')
})

test('choicePathFor', () => {
  assert.equal(choicePathFor(null), '/account-type')
  assert.equal(choicePathFor('/listings?x=1'), '/account-type?next=%2Flistings%3Fx%3D1')
})

test('the gate leaves the choice screen, error pages and a plain sign-in page alone', () => {
  assert.equal(choiceRedirect('/account-type', ''), null)
  assert.equal(choiceRedirect('/account-type', 'next=%2Faccount-type'), null)
  assert.equal(choiceRedirect('/auth/error', ''), null)
  assert.equal(choiceRedirect('/auth/z/error', ''), null)
  assert.equal(choiceRedirect('/auth/login', ''), null)
  assert.equal(choiceRedirect('/auth/login', 'next=%2F%2Fx.com'), null)
})

test('the gate unwraps a sign-in page that carries a next', () => {
  assert.equal(choiceRedirect('/auth/login', 'next=%2Flistings'), '/account-type?next=%2Flistings')
})

test('the gate keeps where the viewer was going, query included', () => {
  assert.equal(choiceRedirect('/', ''), '/account-type')
  assert.equal(choiceRedirect('/', 'q=paris'), '/account-type?next=%2F%3Fq%3Dparis')
  assert.equal(choiceRedirect('/search', 'city=sf'), '/account-type?next=%2Fsearch%3Fcity%3Dsf')
})

test('the gate never redirects twice', () => {
  for (const path of ['/', '/search', '/listings', '/MyBookings/1', '/auth/login', '/reserve/x']) {
    const r = choiceRedirect(path, '')
    if (r === null) continue
    const u = new URL(r, 'http://n')
    assert.equal(choiceRedirect(u.pathname, u.search.slice(1)), null, path)
  }
})

test("after choosing, the other role's area and unsafe targets go home", () => {
  const home = [
    ['/MyBookings', 'business'], ['/MyBookings/123', 'business'], ['/mybookings', 'business'],
    ['/MyBookings?x=1', 'business'], ['/listings', 'personal'], ['/listings/new', 'personal'],
    [null, 'personal'], ['//x.com', 'business'],
  ]
  for (const [next, type] of home) assert.equal(afterChoicePath(next, type), '/', `${next} ${type}`)
})

test('after choosing, your own area and neutral pages are kept', () => {
  assert.equal(afterChoicePath('/listings/new?a=1', 'business'), '/listings/new?a=1')
  assert.equal(afterChoicePath('/MyBookings', 'personal'), '/MyBookings')
  assert.equal(afterChoicePath('/search?city=sf', 'business'), '/search?city=sf')
})

test('parseAccountType', () => {
  assert.equal(parseAccountType('personal'), 'personal')
  assert.equal(parseAccountType('business'), 'business')
  for (const v of ['Business', '', null, { name: 'x' }]) assert.equal(parseAccountType(v), null)
})

test('choiceOutcome', () => {
  assert.deepEqual(choiceOutcome({ requested: 'business', errorCode: null, storedType: null }), { kind: 'continue', type: 'business' })
  assert.deepEqual(choiceOutcome({ requested: 'personal', errorCode: 'P0001', storedType: 'personal' }), { kind: 'continue', type: 'personal' })
  assert.deepEqual(choiceOutcome({ requested: 'business', errorCode: 'P0001', storedType: 'personal' }), { kind: 'already-set', type: 'personal' })
  assert.deepEqual(choiceOutcome({ requested: 'business', errorCode: 'P0001', storedType: null }), { kind: 'error', message: TRY_AGAIN })
  assert.deepEqual(choiceOutcome({ requested: 'business', errorCode: 'P0002', storedType: null }), {
    kind: 'error',
    message: "We couldn't find your account. Sign out and sign in again.",
  })
  assert.deepEqual(choiceOutcome({ requested: 'business', errorCode: 'XX000', storedType: null }), { kind: 'error', message: TRY_AGAIN })
})
