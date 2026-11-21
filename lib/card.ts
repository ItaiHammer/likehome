// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { cardExpired, detectCardBrand, luhnValid } from '../utils/payment-logic.ts'
import { todayISO } from '../app/_components/dates.ts'

export type CardErrors = { cardNumber?: string; expiry?: string; cvc?: string }
export type CardBrandLabel = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Card'

const BRAND_LABELS: Record<string, CardBrandLabel> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
}

/** Display name for a stored brand ("visa" -> "Visa"); anything else is just "Card". */
export function cardBrandLabel(brand: unknown): CardBrandLabel {
  return typeof brand === 'string' && Object.hasOwn(BRAND_LABELS, brand) ? BRAND_LABELS[brand] : 'Card'
}

/** The brand from the first digits, while the number is still being typed. */
export function typedCardBrand(cardNumber: string): CardBrandLabel {
  const clean = cardNumber.replace(/\D/g, '')
  if (/^4/.test(clean)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard'
  if (/^3[47]/.test(clean)) return 'Amex'
  if (/^(6011|65|64[4-9])/.test(clean)) return 'Discover'
  return 'Card'
}

// The card rules /api/checkout uses (utils/payment-logic.ts), checked per field so each error
// shows under its own field instead of one at a time from the server
export function cardErrors(cardNumber: string, expiry: string, cvc: string, today: string = todayISO()): CardErrors {
  const errors: CardErrors = {}
  const digits = cardNumber.replace(/[\s-]/g, '')
  const brand = detectCardBrand(digits)
  if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) errors.cardNumber = 'Enter a valid card number.'
  else if (!brand) errors.cardNumber = 'We accept Visa, Mastercard, American Express and Discover.'

  const exp = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry)
  if (!exp) errors.expiry = 'Use the format MM/YY.'
  else if (cardExpired(Number(exp[1]), 2000 + Number(exp[2]), today)) errors.expiry = 'This card has expired.'

  const cvcLength = brand === 'amex' ? 4 : 3
  if (brand ? !new RegExp(`^\\d{${cvcLength}}$`).test(cvc) : !/^\d{3,4}$/.test(cvc)) {
    errors.cvc = brand ? `Enter the ${cvcLength} digit security code.` : 'Enter the 3 or 4 digit code.'
  }
  return errors
}
