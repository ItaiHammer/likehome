//   PATCH /api/reservations/[id]  -> update a reservation for the logged-in user
import { getUserId } from '../../../../utils/user.ts'
import { updateLiveReservation, updateReservation, getReservation } from '../../../../utils/reservations.ts'
import {
  bookingParty,
  calculateTotalPrice,
  checkCapacity,
  checkPartyLimits,
  validateReservationInput,
  type RoomForBooking,
  todayInTimeZone,
} from '../../../../utils/reservation-logic.ts'
import { partyOf } from '../../../../lib/liteapi/party.ts'
import { liveRoomPrice } from '../../../../lib/liteapi/rates.ts'

// Postgres error code for an exclusion-constraint violation (DB-level double booking guard).
const EXCLUSION_VIOLATION = '23P01'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate logged in user
  const { supabase, userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in to book.' }, { status: 401 })
  }

  // Validate existing reservation
  const { id: reservationId } = await params

  const { data: curReservation, error: reservationError } = await getReservation(reservationId)
  if ( reservationError || !curReservation ) {
    return Response.json({ error: 'Reservation not found. '}, { status: 404 })
  }

  // Validate reservation belongs to user
  const curReservationAccount = curReservation?.account_id
  if (!curReservationAccount || curReservationAccount !== userId) {
    return Response.json({ error: 'Reservation change for another user is forbidden. '}, { status: 403 })
  }

  // Only confirmed bookings can be changed: editing a cancelled (or completed) one would
  // rewrite its history without bringing it back
  if ((curReservation.status ?? 'confirmed') !== 'confirmed') {
    return Response.json({ error: 'Only confirmed reservations can be changed.' }, { status: 409 })
  }
 
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // "Today" is the guest's today, from the time_zone the browser sends
  // (e.g. "America/Los_Angeles"); UTC if it's missing.
  const today = todayInTimeZone((body as Record<string, unknown> | null)?.time_zone)

  // Validate reservation in the future
  if ( curReservation?.check_in <= today) { 
    return Response.json({ error: 'Reservation for past dates cannot be changed. '}, { status: 422 })
  }

  // Merge current and requested for validation. The saved row has guests and children but no
  // adults column, so validation works adults out from those. A new guest count with no split
  // (the Change booking page sends only `guests`) keeps the saved children, as long as at least
  // one adult is left (audit R2).
  const changes = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const savedChildren = Number(curReservation.children ?? 0) || 0
  const party =
    changes.guests !== undefined && changes.adults === undefined && changes.children === undefined
      ? typeof changes.guests === 'number' && Number.isInteger(changes.guests)
        ? { children: Math.max(0, Math.min(savedChildren, changes.guests - 1)) }
        : {}
      : {}
  const saved: Record<string, unknown> = { ...curReservation, children: savedChildren }
  // A new split without a guest count sets the guest count
  if (changes.guests === undefined && (changes.adults !== undefined || changes.children !== undefined)) {
    delete saved.guests
  }
  const requestedReservation = { ...saved, ...party, ...changes }

  // Validate input
  const result = validateReservationInput(requestedReservation, today)
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  const input = result.value

  // Look up the room (price, capacity, hotel). `*` keeps this working before liteapi_hotels.sql is applied.
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*, hotels(*)')
    .eq('id', input.room_id)
    .single<RoomForBooking>()

  if (roomError || !room) {
    return Response.json({ error: 'Room not found.' }, { status: 404 })
  }

  // Capacity
  const capacityError = checkCapacity(input.guests, room)
  if (capacityError) {
    return Response.json({ error: capacityError }, { status: 400 })
  }
  // The room's own adult/child limits (e.g. adults-only), not just the total
  const partyError = checkPartyLimits(input, room)
  if (partyError) {
    return Response.json({ error: partyError }, { status: 400 })
  }

  // Price. An unchanged booking keeps what was paid instead of picking up today's live rate.
  // A change is quoted for its adults and children, as the change page priced it.
  const { adults, children } = bookingParty(input)
  const unchanged = input.room_id === curReservation.room_id && input.check_in === curReservation.check_in
    && input.check_out === curReservation.check_out && input.guests === curReservation.guests
    && children === (curReservation.children ?? 0)
  let nightly: number | string = room.price_per_night
  let pricedLive = false
  if (!unchanged && room.hotels?.liteapi_id) {
    const live = await liveRoomPrice(
      { liteapiHotelId: room.hotels.liteapi_id, liteapiRoomId: room.liteapi_room_id ?? null, roomType: room.room_type ?? '' },
      { checkIn: input.check_in, checkOut: input.check_out, ...partyOf(adults, children) }
    )
    if (live.status === 'sold_out') {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    if (live.status === 'live') {
      nightly = live.value.perNight
      pricedLive = true
    }
  }
  const total_price = unchanged
    ? Number(curReservation.total_price)
    : calculateTotalPrice(input.check_in, input.check_out, nightly)

  const update = {
    room_id: room.id,
    hotel_id: room.hotel_id,
    guests: input.guests,
    children: input.children,
    check_in: input.check_in,
    check_out: input.check_out,
    total_price,
  }
  // A live price is saved with the server key: the reservations trigger puts a signed-in user's own change
  // back at the stored price
  const { data, error } = pricedLive
    ? await updateLiveReservation(reservationId, userId, update)
    : await updateReservation(reservationId, update)

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    console.error('updateReservation failed:', error)
    return Response.json({ error: 'Could not update reservation.' }, { status: 500 })
  }

  return Response.json({ reservation: data?.[0] ?? null }, { status: 200 })
}
