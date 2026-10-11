// Mock payment logic for checkout (US 5.1.3). No real payment provider: nothing is charged.
// No Supabase / Next.js imports here so it can be unit tested with `npm test`.

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover'

export type PaymentInput = {
  cardNumber: string
  last4: string
  brand: CardBrand
  expMonth: number
  expYear: number
}

export type PaymentValidationResult =
  | { ok: true; value: PaymentInput }
  | { ok: false; error: string }

export type AuthorizationResult = { approved: true } | { approved: false; reason: string }

/** Demo cards that always decline (Stripe-style test numbers). Any other valid card is approved. */
export const DECLINED_TEST_CARDS: Record<string, string> = {
  '4000000000000002': 'Your card was declined.',
  '4000000000009995': 'Insufficient funds.',
}

/** Luhn checksum, which catches most mistyped card numbers. */
export function luhnValid(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function detectCardBrand(digits: string): CardBrand | null {
  if (/^4\d{12}(\d{3}){0,2}$/.test(digits)) return 'visa'
  if (/^3[47]\d{13}$/.test(digits)) return 'amex'
  if (/^(5[1-5]\d{2}|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)\d{12}$/.test(digits)) return 'mastercard'
  if (/^6(011|5\d{2}|4[4-9]\d)\d{12,15}$/.test(digits)) return 'discover'
  return null
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

/** Validates the `payment` part of a checkout request. The CVC and name are checked but never returned. */
export function validatePaymentInput(
  body: unknown,
  now: Date = new Date()
): PaymentValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Payment details are required.' }
  }
  const b = body as Record<string, unknown>

  const digits = typeof b.card_number === 'string' ? b.card_number.replace(/[\s-]/g, '') : ''
  if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) {
    return { ok: false, error: 'Enter a valid card number.' }
  }
  const brand = detectCardBrand(digits)
  if (!brand) {
    return { ok: false, error: 'We accept Visa, Mastercard, American Express and Discover.' }
  }

  const expMonth = toInt(b.exp_month)
  let expYear = toInt(b.exp_year)
  if (expMonth === null || expMonth < 1 || expMonth > 12 || expYear === null) {
    return { ok: false, error: 'Enter a valid expiry date.' }
  }
  if (expYear < 100) expYear += 2000
  const thisMonth = now.getUTCFullYear() * 12 + now.getUTCMonth()
  if (expYear * 12 + (expMonth - 1) < thisMonth) {
    return { ok: false, error: 'This card has expired.' }
  }

  const cvcLength = brand === 'amex' ? 4 : 3
  if (typeof b.cvc !== 'string' || !new RegExp(`^\\d{${cvcLength}}$`).test(b.cvc.trim())) {
    return { ok: false, error: `Enter the ${cvcLength} digit security code.` }
  }

  if (typeof b.name_on_card !== 'string' || b.name_on_card.trim() === '') {
    return { ok: false, error: 'Enter the name on your card.' }
  }

  return {
    ok: true,
    value: { cardNumber: digits, last4: digits.slice(-4), brand, expMonth, expYear },
  }
}

/** Stand-in for a payment provider: decides approve/decline from the card number alone. */
export function authorizeMockPayment(cardNumber: string, amount: number): AuthorizationResult {
  if (!(amount > 0)) return { approved: false, reason: 'Invalid payment amount.' }
  if (Object.hasOwn(DECLINED_TEST_CARDS, cardNumber)) {
    return { approved: false, reason: DECLINED_TEST_CARDS[cardNumber] }
  }
  return { approved: true }
}
