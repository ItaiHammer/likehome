// Saved cards for the signed-in account.
//   GET  /api/saved-payment -> the account's cards (brand, last 4, expiry, name; never a full number)
//   POST /api/saved-payment -> save a card typed in by the guest
// Never log the request body: it contains card details.
import { getUserId } from '@/utils/user'
import { guestTimeZone } from '@/utils/guest-today'
import {
  createSavedPaymentMethod,
  getSavedPaymentMethodsByAccount,
} from '@/utils/saved-payment-methods'
import { declinedTestCard, validatePaymentInput } from '@/utils/payment-logic'
import { todayInTimeZone } from '@/utils/reservation-logic'

type SavedRow = {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  name_on_card: string
  is_default: boolean
}

const publicCard = (row: SavedRow) => ({
  id: row.id,
  brand: row.brand,
  last4: row.last4,
  exp_month: row.exp_month,
  exp_year: row.exp_year,
  name_on_card: row.name_on_card,
  is_default: row.is_default,
})

export async function GET() {
  const { userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const { data, error } = await getSavedPaymentMethodsByAccount(userId)
  if (error) {
    console.error('getSavedPaymentMethodsByAccount failed:', { code: error.code })
    return Response.json({ error: 'Could not load saved payment methods.' }, { status: 500 })
  }

  return Response.json({ paymentMethods: ((data ?? []) as SavedRow[]).map(publicCard) })
}

export async function POST(request: Request) {
  const { userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in.' }, { status: 401 })
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
  const input = body as Record<string, unknown>

  const today = todayInTimeZone(await guestTimeZone(input.time_zone))
  const payment = validatePaymentInput(input, today)
  if (!payment.ok) {
    return Response.json({ error: payment.error }, { status: 400 })
  }
  // The same demo cards checkout declines, so a saved card is one checkout would accept
  const declined = declinedTestCard(payment.value.cardNumber)
  if (declined) {
    return Response.json({ error: declined }, { status: 402 })
  }

  const { data, error } = await createSavedPaymentMethod({
    account_id: userId,
    brand: payment.value.brand,
    last4: payment.value.last4,
    exp_month: payment.value.expMonth,
    exp_year: payment.value.expYear,
    name_on_card: String(input.name_on_card).trim(),
  })
  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'This card is already saved.' }, { status: 409 })
    }
    console.error('createSavedPaymentMethod failed:', { code: error.code })
    return Response.json({ error: 'Could not save payment method.' }, { status: 500 })
  }

  const saved = data?.[0] as SavedRow | undefined
  return Response.json({ paymentMethod: saved ? publicCard(saved) : null }, { status: 201 })
}
