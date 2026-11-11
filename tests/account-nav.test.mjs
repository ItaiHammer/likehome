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
const { choiceRedirect, choicePathFor, afterChoicePath } = await import('../lib/account/choice.ts')

const STAYS = { label: 'Stays', href: '/search' }
const MY_BOOKINGS = { label: 'My Bookings', href: '/MyBookings' }
const MY_LISTINGS = { label: 'My Listings', href: '/listings' }

test('header links per role', () => {
  assert.deepEqual(navItemsFor('signed-out'), [STAYS, MY_BOOKINGS, MY_LISTINGS])
  assert.deepEqual(navItemsFor('unchosen'), [STAYS, MY_BOOKINGS, MY_LISTINGS])
  assert.deepEqual(navItemsFor('unknown'), [STAYS, MY_BOOKINGS, MY_LISTINGS])
  assert.deepEqual(navItemsFor('personal'), [STAYS, MY_BOOKINGS])
  assert.deepEqual(navItemsFor('business'), [STAYS, MY_LISTINGS])
})

test('avatar menu link per role', () => {
  assert.deepEqual(accountMenuLinkFor('personal'), MY_BOOKINGS)
  assert.deepEqual(accountMenuLinkFor('business'), MY_LISTINGS)
  assert.equal(accountMenuLinkFor('unchosen'), null)
  assert.equal(accountMenuLinkFor('unknown'), null)
  assert.equal(accountMenuLinkFor('signed-out'), null)
})

test('every unchosen header link leads to the choice screen with that page as next', () => {
  for (const item of navItemsFor('unchosen')) {
    assert.equal(choiceRedirect(item.href, ''), choicePathFor(item.href), item.href)
  }
})

test('after choosing from an unchosen header link, Stays and your own area are kept and the other area goes home', () => {
  const landings = [
    ['/search', 'personal', '/search'],
    ['/search', 'business', '/search'],
    ['/MyBookings', 'personal', '/MyBookings'],
    ['/MyBookings', 'business', '/'],
    ['/listings', 'personal', '/'],
    ['/listings', 'business', '/listings'],
  ]
  for (const [next, type, expected] of landings) assert.equal(afterChoicePath(next, type), expected, `${next} ${type}`)
})
