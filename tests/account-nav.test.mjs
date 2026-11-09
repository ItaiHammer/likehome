// Header links per account role (US 2.4.2)
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

const { navItemsFor, accountMenuLinkFor } = await import('../lib/account/nav.ts')

const STAYS = { label: 'Stays', href: '/search' }
const MY_BOOKINGS = { label: 'My Bookings', href: '/MyBookings' }
const MY_LISTINGS = { label: 'My Listings', href: '/listings' }

test('header links per role', () => {
  assert.deepEqual(navItemsFor('signed-out'), [STAYS])
  assert.deepEqual(navItemsFor('unchosen'), [])
  assert.deepEqual(navItemsFor('personal'), [STAYS, MY_BOOKINGS])
  assert.deepEqual(navItemsFor('business'), [STAYS, MY_LISTINGS])
})

test('avatar menu link per role', () => {
  assert.deepEqual(accountMenuLinkFor('personal'), MY_BOOKINGS)
  assert.deepEqual(accountMenuLinkFor('business'), MY_LISTINGS)
  assert.equal(accountMenuLinkFor('unchosen'), null)
  assert.equal(accountMenuLinkFor('signed-out'), null)
})
