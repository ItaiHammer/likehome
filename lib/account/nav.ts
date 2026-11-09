import { PAGE_ROUTES } from '@/constants/routes'
import type { ViewerRole } from './role'

export type NavLink = { label: string; href: string }

const STAYS: NavLink = { label: 'Stays', href: PAGE_ROUTES.SEARCH }
const MY_BOOKINGS: NavLink = { label: 'My Bookings', href: PAGE_ROUTES.MY_BOOKINGS }
const MY_LISTINGS: NavLink = { label: 'My Listings', href: PAGE_ROUTES.LISTINGS }

export function navItemsFor(role: ViewerRole): NavLink[] {
  if (role === 'unchosen') return []
  const own = accountMenuLinkFor(role)
  return own ? [STAYS, own] : [STAYS]
}

export function accountMenuLinkFor(role: ViewerRole): NavLink | null {
  if (role === 'personal') return MY_BOOKINGS
  if (role === 'business') return MY_LISTINGS
  return null
}
