import { PAGE_ROUTES } from '@/constants/routes'

export type HomeAction = { label: string; href: string; variant: 'primary' | 'secondary' }

export type HomeContent = {
  hero: { eyebrow: string | null; title: string; line: string }
  welcome: { title: string; body: string; actions: HomeAction[] } | null
}

const CONTENT: Record<'signed-out' | 'personal' | 'business', HomeContent> = {
  'signed-out': {
    hero: { eyebrow: null, title: 'Feel at home, anywhere.', line: 'A new favorite stay starts with a hello.' },
    welcome: null,
  },
  personal: {
    hero: { eyebrow: 'Your next chapter', title: 'Welcome back. Where to next?', line: 'Find a place that feels like yours.' },
    welcome: {
      title: 'Plans, in one place.',
      body: 'Your bookings and favorites are always close by.',
      actions: [
        { label: 'My Bookings', href: PAGE_ROUTES.MY_BOOKINGS, variant: 'primary' },
        { label: 'Browse stays', href: PAGE_ROUTES.SEARCH, variant: 'secondary' },
      ],
    },
  },
  business: {
    hero: {
      eyebrow: 'Your places',
      title: 'Welcome back. Ready for your next guests?',
      line: 'Keep your listings fresh and your calendar full.',
    },
    welcome: {
      title: 'Listings, in one place.',
      body: 'Your properties and their details are always close by.',
      actions: [
        { label: 'My Listings', href: PAGE_ROUTES.LISTINGS, variant: 'primary' },
        { label: 'Add property', href: PAGE_ROUTES.LISTINGS_NEW, variant: 'secondary' },
      ],
    },
  },
}

export function homeContentFor(role: 'signed-out' | 'personal' | 'business'): HomeContent {
  return CONTENT[role]
}
