import { getUserId } from '@/utils/user'
import {
  createSavedPaymentMethod,
  getSavedPaymentMethodsByAccount,
} from '@/utils/saved-payment-methods'
import { validatePaymentInput } from '@/utils/payment-logic'

export async function GET() {
  const { userId } = await getUserId()

  if (!userId) {
    return Response.json(
      { error: 'You must be logged in.' },
      { status: 401 }
    )
  }

  const { data, error } = await getSavedPaymentMethodsByAccount(userId)

  if (error) {
    console.error('getSavedPaymentMethodsByAccount failed:', error)

    return Response.json(
      { error: 'Could not load saved payment methods.' },
      { status: 500 }
    )
  }

  return Response.json({
    paymentMethods: data ?? [],
  })
}

export async function POST(request: Request) {
  const { userId } = await getUserId()

  if (!userId) {
    return Response.json(
      { error: 'You must be logged in.' },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  const payment = validatePaymentInput(body)

  if (!payment.ok) {
    return Response.json(
      { error: payment.error },
      { status: 400 }
    )
  }

  const rawName =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).name_on_card
      : null

  const nameOnCard =
    typeof rawName === 'string' ? rawName.trim() : ''

  const { data, error } = await createSavedPaymentMethod({
    account_id: userId,
    brand: payment.value.brand,
    last4: payment.value.last4,
    exp_month: payment.value.expMonth,
    exp_year: payment.value.expYear,
    name_on_card: nameOnCard,
  })

  if (error) {
    if (error.code === '23505') {
      return Response.json(
        { error: 'This payment method is already saved.' },
        { status: 409 }
      )
    }

    console.error('createSavedPaymentMethod failed:', error)

    return Response.json(
      { error: 'Could not save payment method.' },
      { status: 500 }
    )
  }

  return Response.json(
    {
      paymentMethod: data?.[0] ?? null,
    },
    { status: 201 }
  )
}