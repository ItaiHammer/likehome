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
