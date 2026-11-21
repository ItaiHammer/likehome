import {getUserId} from '@/utils/user'
import {getHotelBookingHistory, getHotelCustomerHistory} from '@/utils/history'
import {getHotelsByOwner} from '@/utils/hotels'
import {guestToday} from '@/utils/guest-today'
import {isUuid} from '@/lib/ids'
import {
    toHotelCustomerHistory,
    type HotelBookingRow,
    type HotelCustomerHistory,
    type HotelCustomerRow,
    type OwnerListing,
} from '@/lib/hotel-customers'

// Both history RPCs raise this for a listing the caller doesn't own (or that doesn't exist)
const NOT_OWNER = '42501'

export type HotelCustomersError = 'signed-out' | 'invalid-listing' | 'not-owner' | 'failed'

export type HotelCustomersResult =
    | { ok: true; data: HotelCustomerHistory }
    | { ok: false; reason: HotelCustomersError }

// Customer and booking history for the signed-in owner: one listing, or all of them when hotelId is omitted
export async function getHotelCustomers(hotelId?: string): Promise<HotelCustomersResult> {
    const {userId} = await getUserId()
    if (!userId) return {ok: false, reason: 'signed-out'}
    if (hotelId !== undefined && !isUuid(hotelId)) return {ok: false, reason: 'invalid-listing'}

    const today = await guestToday()
    const [bookings, customers, hotels] = await Promise.all([
        getHotelBookingHistory(hotelId, today),
        getHotelCustomerHistory(hotelId, today),
        getHotelsByOwner(userId),
    ])
    if (bookings.error?.code === NOT_OWNER || customers.error?.code === NOT_OWNER) {
        return {ok: false, reason: 'not-owner'}
    }

    const error = bookings.error ?? customers.error ?? hotels.error
    if (error) {
        console.error('getHotelCustomers failed:', error)
        return {ok: false, reason: 'failed'}
    }

    const listings = (hotels.data ?? []) as OwnerListing[]
    return {
        ok: true,
        data: toHotelCustomerHistory(bookings.data as HotelBookingRow[], customers.data as HotelCustomerRow[], listings),
    }
}
