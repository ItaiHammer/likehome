// Mock payments only. All checkout records are saved in one database transaction.
import { getUserId } from '@/utils/user'
import {
  calculateTotalPrice,
  checkCapacity,
  todayInTimeZone,
  validateReservationInput,
  type RoomForBooking,
} from '@/utils/reservation-logic'
import { authorizeMockPayment, validatePaymentInput } from '@/utils/payment-logic'
import { checkoutReservation, getCancelInsurancePremium } from '@/utils/reservations'

// Postgres error code for an exclusion-constraint violation (DB-level double booking guard).
const EXCLUSION_VIOLATION = '23P01'

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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Request body must be a JSON object.' }, { status: 400 })
  }
  const inputBody = body as Record<string, unknown>
  const hasInsurance = inputBody.has_insurance === undefined ? false : inputBody.has_insurance
  if (typeof hasInsurance !== 'boolean') {
    return Response.json({ error: 'has_insurance must be true or false.' }, { status: 400 })
  }
  const timeZone = typeof inputBody.time_zone === 'string' ? inputBody.time_zone : null
  const stay = validateReservationInput(body, todayInTimeZone(timeZone))
  if (!stay.ok) {
    return Response.json({ error: stay.error }, { status: 400 })
  }
  const card = validatePaymentInput(inputBody.payment)
  if (!card.ok) {
    return Response.json({ error: card.error }, { status: 400 })
  }
  const input = stay.value
  const payment = card.value

  // 2. Look up the room and check capacity
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, hotel_id, price_per_night, capacity')
    .eq('id', input.room_id)
    .single<RoomForBooking>()
  if (roomError || !room) {
    return Response.json({ error: 'Room not found.' }, { status: 404 })
  }
  const capacityError = checkCapacity(input.guests, room)
  if (capacityError) {
    return Response.json({ error: capacityError }, { status: 400 })
  }

  // 3. Price is always calculated here, never taken from the browser
  const totalPrice = calculateTotalPrice(input.check_in, input.check_out, room.price_per_night)

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return Response.json({ error: 'The room does not have a valid booking price.' }, { status: 422 })
  }
  const insurancePremium = hasInsurance ? getCancelInsurancePremium() : 0
  const totalCharged = Math.round((totalPrice + insurancePremium) * 100) / 100
  const authorization = authorizeMockPayment(payment.cardNumber, totalCharged)
  if (!authorization.approved) {
    return Response.json({ error: authorization.reason }, { status: 402 })
  }

  const { data, error } = await checkoutReservation(
    {
      account_id: userId,
      room_id: room.id,
      check_in: input.check_in,
      check_out: input.check_out,
      guests: input.guests,
    },
    {
      total_price: totalPrice,
      has_insurance: hasInsurance,
      insurance_premium: insurancePremium,
      card_last4: payment.last4,
      exp_month: payment.expMonth,
      exp_year: payment.expYear,
    },
    {
      time_zone: timeZone
    }
  )
  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return Response.json({ error: 'Room is not available for those dates.' }, { status: 409 })
    }
    const statuses: Record<string, number> = { PT400: 400, PT401: 401, PT404: 404, PT409: 409 }
    const status = statuses[error.code]
    if (status) return Response.json({ error: error.message }, { status })
    console.error('checkout_reservation failed:', { code: error.code })
    return Response.json({ error: 'Could not complete checkout.' }, { status: 500 })
  }
  if (!data?.reservation || !data?.transaction) {
    return Response.json({ error: 'Could not complete checkout.' }, { status: 500 })
  }

  const reservation = data.reservation
  return Response.json({
    reservation: {
      id: reservation.id,
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      guests: reservation.guests,
      total_price: reservation.total_price,
      status: reservation.status,
      has_insurance: reservation.has_insurance,
    },
    payment: { id: data.payment.id, last4: data.payment.card_number },
    transaction: data.transaction,
    insurance_premium: data.insurance_premium,
    total_charged: data.total_charged,
  }, { status: 201 })
}