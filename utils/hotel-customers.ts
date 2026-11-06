import { getUserId } from '@/utils/user'
import { getHotelBookingHistory } from '@/utils/history'
import { getHotelsByOwner } from '@/utils/hotels'
import { guestToday } from '@/utils/guest-today'
import {
  toHotelCustomerHistory,
  type HotelBookingRow,
  type HotelCustomerHistory,
  type OwnerListing,
} from '@/lib/hotel-customers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// get_hotel_booking_history raises this for a listing the caller doesn't own (or that doesn't exist)
const NOT_OWNER = '42501'

export type HotelCustomersError = 'signed-out' | 'invalid-listing' | 'not-owner' | 'failed'

export type HotelCustomersResult =
  | { ok: true; data: HotelCustomerHistory }
  | { ok: false; reason: HotelCustomersError }

// Customer and booking history for the signed-in owner: one listing, or all of them when hotelId is omitted
export async function getHotelCustomers(hotelId?: string): Promise<HotelCustomersResult> {
  const { userId } = await getUserId()
  if (!userId) return { ok: false, reason: 'signed-out' }
  if (hotelId !== undefined && !UUID.test(hotelId)) return { ok: false, reason: 'invalid-listing' }

  const [history, hotels, today] = await Promise.all([
    getHotelBookingHistory(hotelId),
    getHotelsByOwner(userId),
    guestToday(),
  ])
  if (history.error?.code === NOT_OWNER) return { ok: false, reason: 'not-owner' }

  const error = history.error ?? hotels.error
  if (error) {
    console.error('getHotelCustomers failed:', error)
    return { ok: false, reason: 'failed' }
  }

  const rows = history.data as HotelBookingRow[]
  const listings = (hotels.data ?? []) as OwnerListing[]
  return { ok: true, data: toHotelCustomerHistory(rows, listings, today) }
}
