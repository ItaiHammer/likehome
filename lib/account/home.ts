import { PAGE_ROUTES } from '@/constants/routes'
import type { ViewerRole } from './role'

export type HomeAction = { label: string; href: string; variant: 'primary' | 'secondary' }

export type HomeContent = {
  hero: { eyebrow: string | null; title: string; line: string }
  welcome: { title: string; body: string; actions: HomeAction[] } | null
  // The member promo and featured stays
  signedOutSections: boolean
}

export type HomeRole = Exclude<ViewerRole, 'unchosen'>

const CONTENT: Record<HomeRole, HomeContent> = {
  'signed-out': {
    hero: { eyebrow: null, title: 'Feel at home, anywhere.', line: 'A new favorite stay starts with a hello.' },
    welcome: null,
    signedOutSections: true,
  },
  unknown: {
    hero: { eyebrow: null, title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: null,
    signedOutSections: false,
  },
  personal: {
    hero: { eyebrow: 'Your next chapter', title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: {
      title: 'Plans, in one place.',
      body: 'Your bookings and favorites are always close by.',
      actions: [
        { label: 'My Bookings', href: PAGE_ROUTES.MY_BOOKINGS, variant: 'primary' },
        { label: 'Browse stays', href: PAGE_ROUTES.SEARCH, variant: 'secondary' },
      ],
    },
    signedOutSections: false,
  },
  business: {
    hero: {
      eyebrow: 'Your places',
      title: 'Where to next?',
      line: 'Find a stay anywhere. Your listings are just below.',
    },
    welcome: {
      title: 'Listings, in one place.',
      body: 'Your properties and their details are always close by.',
      actions: [
        { label: 'My Listings', href: PAGE_ROUTES.LISTINGS, variant: 'primary' },
        { label: 'Add property', href: PAGE_ROUTES.LISTINGS_NEW, variant: 'secondary' },
      ],
    },
    signedOutSections: false,
  },
}

export function homeContentFor(role: HomeRole): HomeContent {
  return CONTENT[role]
}
