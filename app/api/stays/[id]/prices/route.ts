//   GET /api/stays/[id]/prices?checkIn=&checkOut=&guests= -> each room's nightly price and sold-out state
import { getHotelStay, withLiveRoomPrices } from '../../../../reserve/[slug]/hotelStay.ts'
import { addDays } from '../../../../_components/dates.ts'
import { countNights, MAX_NIGHTS, parseDate, todayUTC } from '../../../../../utils/reservation-logic.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const query = new URL(request.url).searchParams
  const checkIn = query.get('checkIn') ?? ''
  const checkOut = query.get('checkOut') ?? ''
  const guests = Number(query.get('guests'))

  const valid =
    !!parseDate(checkIn) &&
    !!parseDate(checkOut) &&
    checkOut > checkIn &&
    countNights(checkIn, checkOut) <= MAX_NIGHTS &&
    // A day's slack, like the stay page: the server is on UTC and the guest may be behind it
    checkIn >= addDays(todayUTC(), -1) &&
    Number.isInteger(guests) &&
    guests >= 1 &&
    guests <= 26
  if (!valid) {
    return Response.json({ error: 'Invalid dates or guests.' }, { status: 400, headers: NO_STORE })
  }

  const stay = await getHotelStay(id)
  if (!stay) {
    return Response.json({ error: 'Stay not found.' }, { status: 404, headers: NO_STORE })
  }
  if (!stay.liteapiId) {
    return Response.json(
      {
        live: false,
        configured: !!stay.liteapiConfigured,
        rooms: stay.rooms.map((r) => ({ id: r.id, nightly: r.nightly, soldOut: false })),
      },
      { headers: NO_STORE }
    )
  }

  const priced = await withLiveRoomPrices(stay, { checkIn, checkOut, guests })
  return Response.json(
    {
      live: priced.priceSource === 'live',
      configured: !!stay.liteapiConfigured,
      rooms: priced.rooms.map(({ id, nightly, soldOut }) => ({ id, nightly, soldOut: !!soldOut })),
    },
    { headers: NO_STORE }
  )
}
