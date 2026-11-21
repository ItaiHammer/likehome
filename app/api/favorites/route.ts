// GET /api/favorites -> the signed-in user's saved hotel ids, newest first
// POST /api/favorites { hotelId } -> save a hotel
// DELETE /api/favorites { hotelId } -> unsave a hotel
// Only personal (traveler) accounts save hotels: signed out is 401, any other account 403

import { getViewer } from '../../../utils/viewer.ts'
import { addFavoriteHotel, getFavoriteHotelIds, removeFavoriteHotel } from '../../../utils/favorite-hotels.ts'
import { isHotelId } from '../../../lib/saved-hotels.ts'

const FOREIGN_KEY_VIOLATION = '23503'

async function traveler(): Promise<{ userId: string; refused?: undefined } | { refused: Response }> {
  const { role, userId } = await getViewer()
  if (!userId) return { refused: Response.json({ data: null, error: 'You must be logged in to save hotels.' }, { status: 401 }) }
  if (role !== 'personal') {
    return { refused: Response.json({ data: null, error: 'Only personal accounts can save hotels.' }, { status: 403 }) }
  }
  return { userId }
}

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
  const viewer = await traveler()
  if (viewer.refused) return viewer.refused

  const { data, error } = await getFavoriteHotelIds(viewer.userId)
  if (error) return Response.json({ data: null, error: 'Failed to get saved hotels.' }, { status: 500 })

  const ids = (data ?? []).map((row) => (row as { hotel_id?: unknown }).hotel_id).filter(isHotelId)
  return Response.json({ data: ids, error: null }, { status: 200 })
}

export async function POST(request: Request) {
  const viewer = await traveler()
  if (viewer.refused) return viewer.refused
  const hotelId = await readHotelId(request)
  if (!hotelId) return badHotelId()

  const { error } = await addFavoriteHotel(viewer.userId, hotelId)
  if (error?.code === FOREIGN_KEY_VIOLATION) {
    return Response.json({ data: null, error: 'That hotel no longer exists.' }, { status: 404 })
  }
  if (error) return Response.json({ data: null, error: 'Failed to save hotel.' }, { status: 500 })
  return Response.json({ data: { hotelId, saved: true }, error: null }, { status: 200 })
}

export async function DELETE(request: Request) {
  const viewer = await traveler()
  if (viewer.refused) return viewer.refused
  const hotelId = await readHotelId(request)
  if (!hotelId) return badHotelId()

  const { error } = await removeFavoriteHotel(viewer.userId, hotelId)
  if (error) return Response.json({ data: null, error: 'Failed to remove saved hotel.' }, { status: 500 })
  return Response.json({ data: { hotelId, saved: false }, error: null }, { status: 200 })
}
