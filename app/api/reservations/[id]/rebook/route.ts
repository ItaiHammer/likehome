// Book again: turns one of the guest's past stays into a pre-filled checkout link for new dates.
//   POST /api/reservations/[id]/rebook  { check_in, check_out, time_zone? }
//     -> the same hotel, room type and guest count, plus the /reserve link,
//        or why it can't be rebooked (no longer listed, double-booked).
// Nothing is booked or held here: /api/checkout still checks, prices and saves the new stay.
import { getUserId } from '@/utils/user'
import { getReservation } from '@/utils/reservations'
import { getHotel } from '@/utils/hotels'
import { getRoomsByHotel } from '@/utils/rooms'
import { getOtherStays } from '@/lib/other-stays'
import { findOverlap, overlapMessage } from '@/lib/bookings'
import { rebookHref } from '@/lib/rebook'
import {
  calculateTotalPrice,
  checkCapacity,
  countNights,
  todayInTimeZone,
  validateReservationInput,
} from '@/utils/reservation-logic'

// .single() found no row, and an id that isn't a uuid
const NO_ROW = 'PGRST116'
const NOT_A_UUID = '22P02'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in to book.' }, { status: 401 })
  }

  // 1. The past booking. Someone else's is answered like a missing one.
  const { id } = await params
  const { data: past, error: pastError } = await getReservation(id)
  if (pastError && pastError.code !== NO_ROW && pastError.code !== NOT_A_UUID) {
    console.error('getReservation failed:', pastError)
    return Response.json({ error: 'Could not load the booking.' }, { status: 500 })
  }
  if (!past || past.account_id !== userId) {
    return Response.json({ error: 'Booking not found.' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // 2. The new dates, checked like any new booking's. "Today" is the guest's today, from the
  //    time_zone the browser sends (e.g. "America/Los_Angeles"); UTC if it's missing.
  const b = (body ?? {}) as Record<string, unknown>
  const guests = past.guests ?? 1
  const stay = validateReservationInput(
    { room_id: past.room_id, check_in: b.check_in, check_out: b.check_out, guests },
    todayInTimeZone(b.time_zone)
  )
  if (!stay.ok) {
    return Response.json({ error: stay.error }, { status: 400 })
  }
  const { check_in, check_out } = stay.value

  // 3. The hotel and its rooms as they are now (prices may have changed since the past stay)
  const [hotel, rooms] = await Promise.all([getHotel(past.hotel_id), getRoomsByHotel(past.hotel_id)])
  if (rooms.error || (hotel.error && hotel.error.code !== NO_ROW)) {
    console.error('Loading the hotel to rebook failed:', rooms.error ?? hotel.error)
    return Response.json({ error: 'Could not load the hotel.' }, { status: 500 })
  }
  // Gone, or removed by LiteAPI (search hides those)
  if (!hotel.data || hotel.data.liteapi_deleted_at) {
    return Response.json({ error: 'This hotel is no longer listed.' }, { status: 404 })
  }

  // 4. Only the exact room type booked before, still listed and still big enough (checkout's own check)
  const room = rooms.data?.find((r) => r.id === past.room_id)
  if (!room) {
    return Response.json({ error: 'This hotel room isn’t listed anymore.' }, { status: 404 })
  }
  const capacityError = checkCapacity(guests, room)
  if (capacityError) {
    return Response.json({ error: capacityError }, { status: 400 })
  }

  // 5. The database refuses a stay that overlaps one at another hotel; say which one now, not at payment
  const clash = findOverlap(await getOtherStays(userId, past.hotel_id), check_in, check_out)
  if (clash) {
    return Response.json({ error: overlapMessage(clash) }, { status: 409 })
  }

  // 6. total_price is only for showing: /api/checkout prices the stay again when it's booked
  return Response.json({
    rebook: {
      hotel_id: past.hotel_id,
      hotel_name: hotel.data.name,
      room_id: room.id,
      room_name: room.room_type,
      check_in,
      check_out,
      nights: countNights(check_in, check_out),
      guests,
      total_price: calculateTotalPrice(check_in, check_out, room.price_per_night),
      checkout_url: rebookHref({ hotelId: past.hotel_id, roomId: room.id, checkIn: check_in, checkOut: check_out, guests }),
    },
  })
}
