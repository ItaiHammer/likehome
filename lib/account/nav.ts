import { PAGE_ROUTES } from '@/constants/routes'
import type { ViewerRole } from './role'

export type NavLink = { label: string; href: string }

const STAYS: NavLink = { label: 'Stays', href: PAGE_ROUTES.SEARCH }
const MY_BOOKINGS: NavLink = { label: 'My Bookings', href: PAGE_ROUTES.MY_BOOKINGS }
const MY_LISTINGS: NavLink = { label: 'My Listings', href: PAGE_ROUTES.LISTINGS }

export function navItemsFor(role: ViewerRole): NavLink[] {
  const own = accountMenuLinkFor(role)
  if (own) return [STAYS, own]
  // With the type unreadable, either area link could be the wrong one and end on the no-access page
  if (role === 'unknown') return [STAYS]
  return [STAYS, MY_BOOKINGS, MY_LISTINGS]
}

export function accountMenuLinkFor(role: ViewerRole): NavLink | null {
  if (role === 'personal') return MY_BOOKINGS
  if (role === 'business') return MY_LISTINGS
  return null
}

// The Rewards Flow Figma's dropdown (My Bookings is already in the top nav), minus Settings until it has a page
const PERSONAL_MENU: NavLink[] = [
  { label: 'Account details', href: PAGE_ROUTES.MY_BOOKINGS_ACCOUNT },
  { label: 'Rewards', href: PAGE_ROUTES.REWARDS },
  { label: 'Saved hotels', href: PAGE_ROUTES.MY_BOOKINGS_SAVED },
  { label: 'Payment methods', href: `${PAGE_ROUTES.MY_BOOKINGS_ACCOUNT}#payment-methods` },
]

export function accountMenuItemsFor(role: ViewerRole): NavLink[] {
  if (role === 'personal') return PERSONAL_MENU
  const own = accountMenuLinkFor(role)
  return own ? [own] : []
}
