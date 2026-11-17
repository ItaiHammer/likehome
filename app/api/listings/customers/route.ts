// Owner customer & booking history (US 4.7.2)
//   GET /api/listings/customers            -> every listing the signed-in owner has
//   GET /api/listings/customers?hotel=<id> -> one of their listings
import { getHotelCustomers, type HotelCustomersError } from '@/utils/hotel-customers'

// Guests' names, emails and spending: never cached
const NO_STORE = { 'Cache-Control': 'no-store' }

// A listing that doesn't exist is 403 too, so the route never confirms which ids exist
const ERRORS: Record<HotelCustomersError, { status: number; error: string }> = {
  'signed-out': { status: 401, error: 'Sign in to see your customers.' },
  'invalid-listing': { status: 400, error: 'That listing link isn’t valid.' },
  'not-owner': { status: 403, error: 'You can only see customers for your own listings.' },
  failed: { status: 500, error: 'Couldn’t load your customers. Try again.' },
}

export async function GET(request: Request) {
  const hotelId = new URL(request.url).searchParams.get('hotel') ?? undefined
  const result = await getHotelCustomers(hotelId)
  if (!result.ok) {
    const { status, error } = ERRORS[result.reason]
    return Response.json({ error }, { status, headers: NO_STORE })
  }
  return Response.json(result.data, { headers: NO_STORE })
}
