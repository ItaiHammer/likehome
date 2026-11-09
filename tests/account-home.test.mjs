// Homepage text per account role (US 2.4.2)
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

const { homeContentFor } = await import('../lib/account/home.ts')

test("signed out keeps today's hero and has no welcome banner", () => {
  assert.deepEqual(homeContentFor('signed-out'), {
    hero: { eyebrow: null, title: 'Feel at home, anywhere.', line: 'A new favorite stay starts with a hello.' },
    welcome: null,
  })
})

test('personal', () => {
  assert.deepEqual(homeContentFor('personal'), {
    hero: { eyebrow: 'Your next chapter', title: 'Welcome back. Where to next?', line: 'Find a place that feels like yours.' },
    welcome: {
      title: 'Plans, in one place.',
      body: 'Your bookings and favorites are always close by.',
      actions: [
        { label: 'My Bookings', href: '/MyBookings', variant: 'primary' },
        { label: 'Browse stays', href: '/search', variant: 'secondary' },
      ],
    },
  })
})

test('business', () => {
  assert.deepEqual(homeContentFor('business'), {
    hero: {
      eyebrow: 'Your places',
      title: 'Welcome back. Ready for your next guests?',
      line: 'Keep your listings fresh and your calendar full.',
    },
    welcome: {
      title: 'Listings, in one place.',
      body: 'Your properties and their details are always close by.',
      actions: [
        { label: 'My Listings', href: '/listings', variant: 'primary' },
        { label: 'Add property', href: '/listings/new', variant: 'secondary' },
      ],
    },
  })
})

test('no signed-in state links to sign-in', () => {
  for (const role of ['personal', 'business']) {
    for (const a of homeContentFor(role).welcome.actions) assert.ok(!a.href.startsWith('/auth/'), `${role} ${a.href}`)
  }
})
