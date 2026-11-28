import { PAGE_ROUTES } from '@/constants/routes'
import { RECOMMENDED_CARDS } from '@/lib/recommendations'
import type { ViewerRole } from './role'

export type HomeShortcut = {
  label: string
  /** What the link is for, shown under its label */
  hint: string
  href: string
  icon?: 'messages' | 'add'
  /** The hint gives way to the inbox's unread count once it loads */
  unread?: true
}

export type HomeSection =
  // Signed out: the sign-up card and the feature cards
  | 'join'
  // Personal: next trip, points and shortcuts
  | 'traveler-summary'
  // Business: the title card with its shortcuts, and who is staying or arriving
  | 'owner-today'
  // Rooms booked each night this week, linking into the My Listings calendar
  | 'owner-week'
  | 'owner-properties'
  | 'owner-stats'
  | 'recently-viewed'
  | 'saved-hotels'
  | 'recommended'
  | 'destinations'

export type HomeContent = {
  hero: { title: string; line: string }
  // The signed-in top block's title, line and shortcuts
  welcome: { title: string; body: string; shortcuts: HomeShortcut[] } | null
  recommendedCards: number
  // Everything under the hero, in order
  sections: HomeSection[]
}

export type HomeRole = Exclude<ViewerRole, 'unchosen'>

const SIGNED_IN_CARDS = 6
// Shown to everyone, after the account's own sections
export const SHARED_SECTIONS: HomeSection[] = ['recommended', 'destinations']

const CONTENT: Record<HomeRole, HomeContent> = {
  'signed-out': {
    hero: { title: 'Feel at home, anywhere.', line: 'A new favorite stay starts with a hello.' },
    welcome: null,
    recommendedCards: RECOMMENDED_CARDS,
    sections: ['join', ...SHARED_SECTIONS],
  },
  unknown: {
    hero: { title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: null,
    recommendedCards: SIGNED_IN_CARDS,
    sections: SHARED_SECTIONS,
  },
  personal: {
    hero: { title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: {
      title: 'Plans, in one place.',
      body: 'Your bookings and saved hotels are always close by.',
      shortcuts: [
        { label: 'Browse stays', hint: 'Find somewhere new', href: PAGE_ROUTES.SEARCH },
        { label: 'Saved hotels', hint: 'Your shortlist for later', href: PAGE_ROUTES.MY_BOOKINGS_SAVED },
        { label: 'Messages', hint: 'From the hotels you booked', href: PAGE_ROUTES.MESSAGES, unread: true },
      ],
    },
    recommendedCards: SIGNED_IN_CARDS,
    // Their own history and saved hotels first; each row hides itself when it has nothing
    sections: ['traveler-summary', 'recently-viewed', 'saved-hotels', ...SHARED_SECTIONS],
  },
  business: {
    hero: {
      title: 'Where to next?',
      line: 'Find a stay anywhere. Your listings are just below.',
    },
    welcome: {
      title: 'Ready for your guests.',
      body: 'See who’s arriving and keep your places up to date.',
      shortcuts: [
        { label: 'Message guests', hint: 'Write to guests who booked', href: `${PAGE_ROUTES.OWNER_MESSAGES}?view=compose`, icon: 'messages' },
        { label: 'Add property', hint: 'List a new place', href: PAGE_ROUTES.LISTINGS_NEW, icon: 'add' },
      ],
    },
    recommendedCards: SIGNED_IN_CARDS,
    sections: ['owner-today', 'owner-week', 'owner-properties', 'owner-stats', ...SHARED_SECTIONS],
  },
}

export function homeContentFor(role: HomeRole): HomeContent {
  return CONTENT[role]
}
