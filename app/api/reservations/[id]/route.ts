//   PATCH /api/reservations/[id] -> update a reservation for the logged-in user
import { getUserId } from '../../../../utils/user.ts'
import { editReservation, getReservation } from '../../../../utils/reservations.ts'
import {
  checkCapacity,
  validateReservationInput,
  type RoomForBooking,
  todayInTimeZone,
} from '../../../../utils/reservation-logic.ts'

// Postgres error code for an exclusion-constraint violation (DB-level double booking guard).
const EXCLUSION_VIOLATION = '23P01'

const EDIT_ERROR_STATUS: Record<string, number> = {
  PT400: 400,
  PT401: 401,
  PT402: 402,
  PT404: 404,
  PT409: 409,
  PT422: 422,
}

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

  if (curReservation.status !== 'confirmed') {
    return Response.json({ error: 'Only confirmed reservations can be changed.' }, { status: 422 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Request body must be a JSON object.' }, { status: 400 })
  }

  const changes = body as Record<string, unknown>
  const paymentMethod = changes.payment_method === undefined
    ? 'card'
    : changes.payment_method

  if (paymentMethod !== 'card' && paymentMethod !== 'points') {
    return Response.json({ error: 'payment_method must be card or points.' }, { status: 400 })
  }

  const timeZone = typeof changes.time_zone === 'string'
    ? changes.time_zone
    : null

  // "Today" is the guest's today, from the time_zone the browser sends
  // (e.g. "America/Los_Angeles"); UTC if it's missing.
  const today = todayInTimeZone(timeZone)

  // Validate reservation in the future
  if (curReservation?.check_in <= today) {
    return Response.json({ error: 'Reservation for past dates cannot be changed. '}, { status: 422 })
  }

  // Merge current and requested for validation
  const requestedReservation = { ...curReservation, ...changes }

  // Validate input
  const result = validateReservationInput(requestedReservation, today)
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  const input = result.value

  // Look up the room (price, capacity, hotel)
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, hotel_id, price_per_night, capacity')
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

  // The RPC reprices and settles the edit inside one database transaction.
  const { data, error } = await editReservation(
    reservationId,
    {
      room_id: room.id,
      guests: input.guests,
      check_in: input.check_in,
      check_out: input.check_out,
    },
    {
      payment_method: paymentMethod,
      time_zone: timeZone,
      expected: {
        room_id: curReservation.room_id,
        check_in: curReservation.check_in,
        check_out: curReservation.check_out,
        guests: curReservation.guests ?? null,
        total_price: Number(curReservation.total_price),
      },
    }
  )

  // Error Handling
  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }

    const status = EDIT_ERROR_STATUS[error.code]
    if (status) {
      return Response.json({ error: error.message }, { status })
    }

    console.error('editReservation failed:', error)
    return Response.json({ error: 'Could not update reservation.' }, { status: 500 })
  }

  const reservation = data?.[0]
  if (!reservation) {
    console.error('editReservation returned no reservation')
    return Response.json({ error: 'Could not update reservation.' }, { status: 500 })
  }

  return Response.json({ reservation }, { status: 200 })
}