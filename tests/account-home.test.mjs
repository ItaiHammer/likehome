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
const { RECOMMENDED_CARDS } = await import('../lib/recommendations.ts')

const ROLES = ['signed-out', 'unknown', 'personal', 'business']

test("signed out keeps today's hero and opens with the sign-up card", () => {
  assert.deepEqual(homeContentFor('signed-out'), {
    hero: { title: 'Feel at home, anywhere.', line: 'A new favorite stay starts with a hello.' },
    welcome: null,
    recommendedCards: RECOMMENDED_CARDS,
    sections: ['join', 'destinations', 'recommended'],
  })
})

test('personal: next trip, points and shortcuts first, then their own history and saved hotels', () => {
  assert.deepEqual(homeContentFor('personal'), {
    hero: { title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: {
      title: 'Plans, in one place.',
      body: 'Your bookings and saved hotels are always close by.',
      shortcuts: [
        { label: 'Browse stays', hint: 'Find somewhere new', href: '/search' },
        { label: 'Saved hotels', hint: 'Your shortlist for later', href: '/MyBookings?tab=saved' },
        { label: 'Messages', hint: 'From the hotels you booked', href: '/messages', unread: true },
      ],
    },
    recommendedCards: 3,
    sections: ['traveler-summary', 'recently-viewed', 'saved-hotels', 'recommended', 'destinations'],
  })
})

test('business: guests, properties and how they are doing, before the shared sections', () => {
  assert.deepEqual(homeContentFor('business'), {
    hero: {
      title: 'Where to next?',
      line: 'Find a stay anywhere. Your listings are just below.',
    },
    welcome: {
      title: 'Ready for your guests.',
      body: 'See who’s arriving and keep your places up to date.',
      shortcuts: [
        { label: 'Message guests', hint: 'Write to guests who booked', href: '/property-dashboard/messages', icon: 'messages' },
        { label: 'Add property', hint: 'List a new place', href: '/listings/new', icon: 'add' },
      ],
    },
    recommendedCards: 3,
    sections: ['owner-today', 'owner-week', 'owner-properties', 'owner-stats', 'destinations', 'recommended'],
  })
})

test('unknown (the account read failed): signed in, a neutral hero, no welcome block and no sign-up card', () => {
  assert.deepEqual(homeContentFor('unknown'), {
    hero: { title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: null,
    recommendedCards: 3,
    sections: ['destinations', 'recommended'],
  })
})

test('only signed-out visitors get the sign-up card', () => {
  for (const role of ROLES) {
    assert.equal(homeContentFor(role).sections.includes('join'), role === 'signed-out', role)
  }
})

test('each role lists a section once, and a welcome block only with its copy', () => {
  for (const role of ROLES) {
    const { sections, welcome } = homeContentFor(role)
    assert.equal(new Set(sections).size, sections.length, role)
    const usesWelcome = sections.includes('traveler-summary') || sections.includes('owner-today')
    assert.equal(usesWelcome, welcome !== null, role)
  }
})

test('no signed-in shortcut links to sign-in', () => {
  for (const role of ['personal', 'business']) {
    for (const s of homeContentFor(role).welcome.shortcuts) assert.ok(!s.href.startsWith('/auth/'), `${role} ${s.href}`)
  }
})

test('no hero says "Welcome back", so it reads right for a brand-new account too', () => {
  for (const role of ROLES) {
    assert.ok(!/welcome back/i.test(homeContentFor(role).hero.title), role)
  }
})
