// Checkout API (US 5.1.3): mock payment, real database writes. Nothing is actually charged.
//   POST /api/checkout -> validate, price on the server, run the mock charge, then save
//                         the reservation, its payment (last 4 digits only) and the charge.
// Never log the request body: it contains card details.
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createReservation, updateReservation } from '@/utils/reservations'
import { createPayment } from '@/utils/payments'
import { createTransaction } from '@/utils/transactions'
import {
  bookingParty,
  calculateTotalPrice,
  checkCapacity,
  todayInTimeZone,
  validateReservationInput,
  type RoomForBooking,
} from '@/utils/reservation-logic'
import { authorizeMockPayment, validatePaymentInput } from '@/utils/payment-logic'
import { partyOf } from '@/lib/liteapi/party'
import { liveRoomPrice } from '@/lib/liteapi/rates'

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

  // 1. Validate the stay and the card. "Today" is the guest's today, from the
  //    time_zone the browser sends (e.g. "America/Los_Angeles"); UTC if it's missing.
  const timeZone = (body as Record<string, unknown> | null)?.time_zone
  const stay = validateReservationInput(body, todayInTimeZone(timeZone))
  if (!stay.ok) {
    return Response.json({ error: stay.error }, { status: 400 })
  }
  const card = validatePaymentInput((body as Record<string, unknown>).payment)
  if (!card.ok) {
    return Response.json({ error: card.error }, { status: 400 })
  }
  const input = stay.value
  const payment = card.value

  // 2. Look up the room and check capacity. `*` rather than the LiteAPI columns by name, so booking
  //    keeps working (at stored prices) on a database without supabase/migrations/liteapi_hotels.sql.
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*, hotels(*)')
    .eq('id', input.room_id)
    .single<RoomForBooking>()

  if (roomError || !room) {
    return Response.json({ error: 'Room not found.' }, { status: 404 })
  }
  const capacityError = checkCapacity(input.guests, room)
  if (capacityError) {
    return Response.json({ error: capacityError }, { status: 400 })
  }

  // 3. Price is always calculated here, never taken from the browser. LiteAPI hotels reuse the
  //    quote the stay page cached (the same adults and children), so the guest pays what they were
  //    shown; if LiteAPI is down, the stored estimate is charged instead.
  let nightly: number | string = room.price_per_night
  const liteapiHotelId = room.hotels?.liteapi_id
  if (liteapiHotelId) {
    const { adults, children } = bookingParty(input)
    const live = await liveRoomPrice(
      { liteapiHotelId, liteapiRoomId: room.liteapi_room_id ?? null, roomType: room.room_type ?? '' },
      { checkIn: input.check_in, checkOut: input.check_out, ...partyOf(adults, children) }
    )
    if (live.status === 'sold_out') {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    if (live.status === 'live') nightly = live.value.perNight
  }
  const total_price = calculateTotalPrice(input.check_in, input.check_out, nightly)

  // 4. Mock charge. A decline writes nothing.
  const auth = authorizeMockPayment(payment.cardNumber, total_price)
  if (!auth.approved) {
    return Response.json({ error: auth.reason }, { status: 402 })
  }

  // 5. Save the reservation
  const { data: reservations, error: reservationError } = await createReservation({
    account_id: userId,
    hotel_id: room.hotel_id,
    room_id: room.id,
    check_in: input.check_in,
    check_out: input.check_out,
    total_price,
    guests: input.guests,
    // Saved so a later change is priced for the same party
    children: input.children,
  })
  const reservation = reservations?.[0]

  if (reservationError || !reservation) {
    if (reservationError?.code === EXCLUSION_VIOLATION) {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    console.error('createReservation failed:', reservationError)
    return Response.json({ error: 'Could not create reservation.' }, { status: 500 })
  }

  // 6. Save the payment (last 4 digits only) and the completed charge
  const { data: payments, error: paymentError } = await createPayment({
    reservation_id: reservation.id,
    account_id: userId,
    card_number: payment.last4,
    card_exp_month: payment.expMonth,
    card_exp_year: payment.expYear,
  })
  const savedPayment = payments?.[0]

  const { data: transactions, error: transactionError } = savedPayment
    ? await createTransaction({
        payment_id: savedPayment.id,
        amount: total_price,
        transaction_type: 'charge',
        status: 'completed',
      })
    : { data: null, error: null }
  const transaction = transactions?.[0]

  // 7. Supabase can't wrap these inserts in one DB transaction, so undo by hand:
  //    cancel the reservation so an unpaid booking doesn't block the room.
  if (!savedPayment || !transaction) {
    console.error('Recording payment failed:', paymentError ?? transactionError)
    const { error: cancelError } = await updateReservation(reservation.id, { status: 'cancelled' })
    if (cancelError) console.error('Cancelling unpaid reservation failed:', cancelError)
    return Response.json(
      { error: 'Payment could not be recorded. You have not been charged.' },
      { status: 500 }
    )
  }

  return Response.json(
    {
      reservation: {
        id: reservation.id,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        guests: reservation.guests,
        total_price: reservation.total_price,
        status: reservation.status,
      },
      payment: { id: savedPayment.id, brand: payment.brand, last4: payment.last4 },
      transaction: { id: transaction.id, amount: transaction.amount, status: transaction.status },
    },
    { status: 201 }
  )
}
