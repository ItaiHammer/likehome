// Quick Reservation API (US 4.1.2)
//   POST /api/reservations  -> create a reservation for the logged-in user
//   GET  /api/reservations  -> list the logged-in user's reservations
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createReservation, getReservationsByAccount } from '@/utils/reservations'
import {
  calculateTotalPrice,
  checkCapacity,
  datesOverlap,
  validateReservationInput,
  type RoomForBooking,
} from '@/utils/reservation-logic'

// Postgres error code for an exclusion-constraint violation (DB-level double booking guard).
const EXCLUSION_VIOLATION = '23P01'

async function getUserId() {
  const supabase = createClient(await cookies())
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return { supabase, userId: null }
  return { supabase, userId: data.claims.sub as string }
}

export async function POST(request: Request) {
  const { supabase, userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in to book.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // 1. Validate input
  const result = validateReservationInput(body)
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  const input = result.value

  // 2. Look up the room (price, capacity, hotel)
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, hotel_id, price_per_night, capacity')
    .eq('id', input.room_id)
    .single<RoomForBooking>()

  if (roomError || !room) {
    return Response.json({ error: 'Room not found.' }, { status: 404 })
  }

  // 3. Capacity
  const capacityError = checkCapacity(input.guests, room)
  if (capacityError) {
    return Response.json({ error: capacityError }, { status: 400 })
  }

  // 4. Availability (best-effort app check).
  // NOTE: with the current RLS (users can only read their own reservations) this
  // only sees the caller's own bookings. The real guard should be the DB
  // exclusion constraint, which is caught below as a 409.
  const { data: existing } = await supabase
    .from('reservations')
    .select('check_in, check_out')
    .eq('room_id', room.id)
    .eq('status', 'confirmed')
    .lt('check_in', input.check_out)
    .gt('check_out', input.check_in)

  if (existing?.some((r) => datesOverlap(r.check_in, r.check_out, input.check_in, input.check_out))) {
    return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
  }

  // 5. Price + insert (uses Chloe's createReservation)
  const total_price = calculateTotalPrice(input.check_in, input.check_out, room.price_per_night)

  const { data, error } = await createReservation({
    account_id: userId,
    hotel_id: room.hotel_id,
    room_id: room.id,
    check_in: input.check_in,
    check_out: input.check_out,
    total_price,
    guests: input.guests,
  })

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    console.error('createReservation failed:', error)
    return Response.json({ error: 'Could not create reservation.' }, { status: 500 })
  }

  return Response.json({ reservation: data?.[0] ?? null }, { status: 201 })
}

export async function GET() {
  const { userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const { data, error } = await getReservationsByAccount(userId)
  if (error) {
    console.error('getReservationsByAccount failed:', error)
    return Response.json({ error: 'Could not load reservations.' }, { status: 500 })
  }
  return Response.json({ reservations: data ?? [] })
}
