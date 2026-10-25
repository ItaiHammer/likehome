// guestToday: server pages read the guest's time zone from the `tz` cookie.
import { register } from 'node:module'
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s === 'next/headers') return next('next/headers.js', c)
      if (s.startsWith('./') && !s.endsWith('.ts') && c.parentURL?.includes('/utils/')) return next(s + '.ts', c)
      return next(s, c)
    }`)
)

let cookieValue
mock.module('next/headers', {
  namedExports: { cookies: async () => ({ get: (name) => (name === 'tz' && cookieValue ? { value: cookieValue } : undefined) }) },
})
const { guestToday } = await import('../utils/guest-today.ts')

// 6pm Pacific on Oct 10 is already Oct 11 in UTC
const pacificEvening = new Date('2026-10-11T01:00:00Z')

test('uses the time zone from the cookie', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: pacificEvening })
  cookieValue = 'America/Los_Angeles'
  assert.equal(await guestToday(), '2026-10-10')
})

test('falls back to UTC with no cookie (first visit) or a bad one', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: pacificEvening })
  cookieValue = undefined
  assert.equal(await guestToday(), '2026-10-11')
  cookieValue = 'Not/AZone'
  assert.equal(await guestToday(), '2026-10-11')
})
