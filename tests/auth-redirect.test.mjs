// US2.1 Account Creation — QA 2.1.5: OAuth redirect round trip
// (login page → provider → /api/auth/callback → back to where the user was going)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authErrorPath, loginPath, oauthRedirectUrl, postLoginUrl, safeNext } from '../lib/auth-redirect.ts'

// ---- safeNext: only same-site paths survive ----
test('safeNext keeps same-site paths, including query strings', () => {
  assert.equal(safeNext('/MyBookings'), '/MyBookings')
  assert.equal(safeNext('/reserve/casa-del-sol?checkIn=2026-12-01&guests=2'), '/reserve/casa-del-sol?checkIn=2026-12-01&guests=2')
})

test('safeNext falls back to / for missing or external targets', () => {
  for (const bad of [null, undefined, '', 'MyBookings', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)']) {
    assert.equal(safeNext(bad), '/', `expected / for ${JSON.stringify(bad)}`)
  }
})

// ---- oauthRedirectUrl: where the provider sends the user back ----
test('uses the origin the user is on (PKCE cookie lives there)', () => {
  assert.equal(
    oauthRedirectUrl('https://likehome-git-feature.vercel.app', 'likehome.app'),
    'https://likehome-git-feature.vercel.app/api/auth/callback',
  )
  assert.equal(oauthRedirectUrl('http://localhost:3000'), 'http://localhost:3000/api/auth/callback')
})

test('env fallbacks are normalized (previously produced broken URLs)', () => {
  const cases = [
    ['https://likehome.app', 'https://likehome.app/api/auth/callback'], // was https://https://likehome.app/...
    ['likehome.app/', 'https://likehome.app/api/auth/callback'], // was https://likehome.app//api/...
    ['127.0.0.1:3000', 'http://127.0.0.1:3000/api/auth/callback'], // was https://127.0.0.1:3000/...
    ['  likehome.app  ', 'https://likehome.app/api/auth/callback'],
    ['localhost:3000', 'http://localhost:3000/api/auth/callback'],
  ]
  for (const [site, expected] of cases) assert.equal(oauthRedirectUrl(null, site), expected, `SITE_URL=${site}`)
})

test('empty SITE_URL falls through to the Vercel URL (was https:///api/...)', () => {
  assert.equal(oauthRedirectUrl(null, '', 'likehome-abc.vercel.app'), 'https://likehome-abc.vercel.app/api/auth/callback')
})

test('no origin and no env → localhost:3000', () => {
  assert.equal(oauthRedirectUrl(null), 'http://localhost:3000/api/auth/callback')
})

test('carries ?next= through to the callback, encoded', () => {
  assert.equal(
    oauthRedirectUrl('https://likehome.app', undefined, undefined, '?next=%2Freserve%2Fcasa%3Fguests%3D2'),
    'https://likehome.app/api/auth/callback?next=%2Freserve%2Fcasa%3Fguests%3D2',
  )
})

test('drops an external ?next=', () => {
  assert.equal(oauthRedirectUrl('https://likehome.app', undefined, undefined, '?next=//evil.com'), 'https://likehome.app/api/auth/callback')
  assert.equal(oauthRedirectUrl('https://likehome.app', undefined, undefined, '?next=https://evil.com'), 'https://likehome.app/api/auth/callback')
})

// ---- postLoginUrl: where the callback sends a newly signed-in user ----
test('new account lands on home by default', () => {
  assert.equal(postLoginUrl('http://localhost:3000', null, null, true), 'http://localhost:3000/')
})

test('returns to the page that asked for sign-in', () => {
  assert.equal(postLoginUrl('https://likehome.app', null, '/MyBookings/abc', false), 'https://likehome.app/MyBookings/abc')
})

test('behind a load balancer, prod uses x-forwarded-host; dev ignores it', () => {
  assert.equal(postLoginUrl('http://10.0.0.5:3000', 'likehome.app', '/MyBookings', false), 'https://likehome.app/MyBookings')
  assert.equal(postLoginUrl('http://localhost:3000', 'likehome.app', '/MyBookings', true), 'http://localhost:3000/MyBookings')
})

test('never redirects off-site after login', () => {
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com']) {
    assert.equal(postLoginUrl('https://likehome.app', null, bad, false), 'https://likehome.app/')
  }
})

// ---- error / retry paths ----
test('auth error page keeps next for "Try again"', () => {
  assert.equal(authErrorPath(null), '/auth/error')
  assert.equal(authErrorPath('/'), '/auth/error')
  assert.equal(authErrorPath('/reserve/x?a=1'), '/auth/error?next=%2Freserve%2Fx%3Fa%3D1')
  assert.equal(authErrorPath('//evil.com'), '/auth/error')
})

test('"Try again" goes back to login with the same next', () => {
  assert.equal(loginPath(undefined), '/auth/login')
  assert.equal(loginPath('/MyBookings'), '/auth/login?next=%2FMyBookings')
  assert.equal(loginPath('//evil.com'), '/auth/login')
})

// ---- full round trip ----
test('round trip: Sign in to reserve → provider → callback → back to the stay', () => {
  const stay = '/reserve/casa-del-sol?checkIn=2026-12-01&checkOut=2026-12-04&guests=2'
  const loginSearch = new URL(`https://likehome.app${loginPath(stay)}`).search
  const callback = new URL(oauthRedirectUrl('https://likehome.app', undefined, undefined, loginSearch))
  assert.equal(callback.pathname, '/api/auth/callback')
  const landed = postLoginUrl(callback.origin, null, callback.searchParams.get('next'), false)
  assert.equal(landed, `https://likehome.app${stay}`)
})

test('round trip on failure: callback → error → Try again → login keeps the stay', () => {
  const stay = '/reserve/casa-del-sol?guests=2'
  const errorUrl = new URL(`https://likehome.app${authErrorPath(stay)}`)
  assert.equal(loginPath(errorUrl.searchParams.get('next')), `/auth/login?next=${encodeURIComponent(stay)}`)
})
