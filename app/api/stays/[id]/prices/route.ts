//   GET /api/stays/[id]/prices?checkIn=&checkOut=&adults=&children= -> each room's name, nightly price, sold-out state,
//                                                                     cancellation terms and fees due at the property
import { getHotelStay, withLiveRoomPrices } from '../../../../reserve/[slug]/hotelStay.ts'
import { addDays } from '../../../../_components/dates.ts'
import type { Room } from '../../../../_data/stays.ts'
import { partyOf } from '../../../../../lib/liteapi/party.ts'
import { countNights, MAX_NIGHTS, parseDate, todayUTC } from '../../../../../utils/reservation-logic.ts'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Every key is set, null when the room has no live quote, so the page drops what an earlier quote showed
const roomPrice = (r: Room) => ({
  id: r.id,
  name: r.name,
  nightly: r.nightly,
  soldOut: !!r.soldOut,
  refundable: r.refundable ?? null,
  cancelBy: r.cancelBy ?? null,
  dueAtProperty: r.dueAtProperty ?? null,
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const query = new URL(request.url).searchParams
  const checkIn = query.get('checkIn') ?? ''
  const checkOut = query.get('checkOut') ?? ''
  const adults = Number(query.get('adults'))
  const children = Number(query.get('children') ?? 0)

  const valid =
    !!parseDate(checkIn) &&
    !!parseDate(checkOut) &&
    checkOut > checkIn &&
    countNights(checkIn, checkOut) <= MAX_NIGHTS &&
    // A day's slack, like the stay page: the server is on UTC and the guest may be behind it
    checkIn >= addDays(todayUTC(), -1) &&
    // The stay page's own limits on the guests in a link
    Number.isInteger(adults) &&
    adults >= 1 &&
    adults <= 16 &&
    Number.isInteger(children) &&
    children >= 0 &&
    children <= 10
  if (!valid) {
    return Response.json({ error: 'Invalid dates or guests.' }, { status: 400, headers: NO_STORE })
  }

  const stay = await getHotelStay(id)
  if (!stay) {
    return Response.json({ error: 'Stay not found.' }, { status: 404, headers: NO_STORE })
  }
  if (!stay.liteapiId) {
    return Response.json(
      { live: false, configured: !!stay.liteapiConfigured, rooms: stay.rooms.map(roomPrice) },
      { headers: NO_STORE }
    )
  }

  const priced = await withLiveRoomPrices(stay, { checkIn, checkOut, ...partyOf(adults, children) })
  return Response.json(
    { live: priced.priceSource === 'live', configured: !!stay.liteapiConfigured, rooms: priced.rooms.map(roomPrice) },
    { headers: NO_STORE }
  )
}
