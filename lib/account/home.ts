import { PAGE_ROUTES } from '@/constants/routes'
import type { ViewerRole } from './role'

export type HomeAction = {
  label: string
  /** What the link is for, shown under its label */
  hint: string
  icon: 'bookings' | 'search' | 'listings' | 'add'
  href: string
  variant: 'primary' | 'secondary'
}

export type HomeContent = {
  hero: { title: string; line: string }
  welcome: { title: string; body: string; actions: HomeAction[] } | null
  // The member promo and featured stays
  signedOutSections: boolean
}

export type HomeRole = Exclude<ViewerRole, 'unchosen'>

const CONTENT: Record<HomeRole, HomeContent> = {
  'signed-out': {
    hero: { title: 'Feel at home, anywhere.', line: 'A new favorite stay starts with a hello.' },
    welcome: null,
    signedOutSections: true,
  },
  unknown: {
    hero: { title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: null,
    signedOutSections: false,
  },
  personal: {
    hero: { title: 'Where to next?', line: 'Find a place that feels like yours.' },
    welcome: {
      title: 'Plans, in one place.',
      body: 'Your bookings and favorites are always close by.',
      actions: [
        { label: 'My Bookings', hint: 'Change or cancel a stay', icon: 'bookings', href: PAGE_ROUTES.MY_BOOKINGS, variant: 'primary' },
        { label: 'Browse stays', hint: 'Find somewhere new', icon: 'search', href: PAGE_ROUTES.SEARCH, variant: 'secondary' },
      ],
    },
    signedOutSections: false,
  },
  business: {
    hero: {
      title: 'Where to next?',
      line: 'Find a stay anywhere. Your listings are just below.',
    },
    welcome: {
      title: 'Listings, in one place.',
      body: 'Your properties and their details are always close by.',
      actions: [
        { label: 'My Listings', hint: 'Edit rooms and photos', icon: 'listings', href: PAGE_ROUTES.LISTINGS, variant: 'primary' },
        { label: 'Add property', hint: 'List a new place', icon: 'add', href: PAGE_ROUTES.LISTINGS_NEW, variant: 'secondary' },
      ],
    },
    signedOutSections: false,
  },
}

export function homeContentFor(role: HomeRole): HomeContent {
  return CONTENT[role]
}
