//   PATCH /api/reservations/[id]  -> update a reservation for the logged-in user
import { getUserId } from '../../../../utils/user.ts'
import { updateReservation, getReservation } from '../../../../utils/reservations.ts'
import {
  calculateTotalPrice,
  checkCapacity,
  validateReservationInput,
  type RoomForBooking,
} from '../../../../utils/reservation-logic.ts'

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
    return Response.json({ error: 'Reservation change is forbidden. '}, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // Merge current and requested for validation
  const requestedReservation = curReservation ? { ...curReservation, ...(body as object) } : body

  // Validate input
  const result = validateReservationInput(requestedReservation)
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

  // Price + insert
  const total_price = calculateTotalPrice(input.check_in, input.check_out, room.price_per_night)

  // TODO(Database): update function call with final interface
  const { data, error } = await updateReservation(
    reservationId,
    {
    // room_id: room.id,
    check_in: input.check_in,
    check_out: input.check_out,
    total_price,
  })

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    console.error('updateReservation failed:', error)
    return Response.json({ error: 'Could not update reservation.' }, { status: 500 })
  }

  return Response.json({ reservation: data?.[0] ?? null }, { status: 200 })
}
