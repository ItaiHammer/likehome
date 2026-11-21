// GET /api/favorites -> the signed-in user's saved hotel ids, newest first
// POST /api/favorites { hotelId } -> save a hotel
// DELETE /api/favorites { hotelId } -> unsave a hotel

import { getUserId } from '../../../utils/user.ts'
import { addFavoriteHotel, getFavoriteHotelIds, removeFavoriteHotel } from '../../../utils/favorite-hotels.ts'
import { isHotelId } from '../../../lib/saved-hotels.ts'

const FOREIGN_KEY_VIOLATION = '23503'

const signedOut = () => Response.json({ data: null, error: 'You must be logged in to save hotels.' }, { status: 401 })

async function readHotelId(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json()
    const hotelId = typeof body === 'object' && body !== null ? (body as { hotelId?: unknown }).hotelId : null
    return isHotelId(hotelId) ? hotelId.toLowerCase() : null
  } catch {
    return null
  }
}

const badHotelId = () => Response.json({ data: null, error: 'Required field hotelId must be a hotel id.' }, { status: 400 })

export async function GET() {
  const { userId } = await getUserId()
  if (!userId) return signedOut()

  const { data, error } = await getFavoriteHotelIds(userId)
  if (error) return Response.json({ data: null, error: 'Failed to get saved hotels.' }, { status: 500 })

  const ids = (data ?? []).map((row) => (row as { hotel_id?: unknown }).hotel_id).filter(isHotelId)
  return Response.json({ data: ids, error: null }, { status: 200 })
}

export async function POST(request: Request) {
  const { userId } = await getUserId()
  if (!userId) return signedOut()
  const hotelId = await readHotelId(request)
  if (!hotelId) return badHotelId()

  const { error } = await addFavoriteHotel(userId, hotelId)
  if (error?.code === FOREIGN_KEY_VIOLATION) {
    return Response.json({ data: null, error: 'That hotel no longer exists.' }, { status: 404 })
  }
  if (error) return Response.json({ data: null, error: 'Failed to save hotel.' }, { status: 500 })
  return Response.json({ data: { hotelId, saved: true }, error: null }, { status: 200 })
}

export async function DELETE(request: Request) {
  const { userId } = await getUserId()
  if (!userId) return signedOut()
  const hotelId = await readHotelId(request)
  if (!hotelId) return badHotelId()

  const { error } = await removeFavoriteHotel(userId, hotelId)
  if (error) return Response.json({ data: null, error: 'Failed to remove saved hotel.' }, { status: 500 })
  return Response.json({ data: { hotelId, saved: false }, error: null }, { status: 200 })
}
