// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
import { detectCardBrand, luhnValid } from '../utils/payment-logic.ts'

export type CardErrors = { cardNumber?: string; expiry?: string; cvc?: string }

// The card rules /api/checkout uses (utils/payment-logic.ts), checked per field so each error
// shows under its own field instead of one at a time from the server
export function cardErrors(cardNumber: string, expiry: string, cvc: string, now: Date = new Date()): CardErrors {
  const errors: CardErrors = {}
  const digits = cardNumber.replace(/[\s-]/g, '')
  const brand = detectCardBrand(digits)
  if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) errors.cardNumber = 'Enter a valid card number.'
  else if (!brand) errors.cardNumber = 'We accept Visa, Mastercard, American Express and Discover.'

  const exp = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry)
  if (!exp) errors.expiry = 'Use the format MM/YY.'
  else if ((2000 + Number(exp[2])) * 12 + Number(exp[1]) - 1 < now.getUTCFullYear() * 12 + now.getUTCMonth()) errors.expiry = 'This card has expired.'

  const cvcLength = brand === 'amex' ? 4 : 3
  if (brand ? !new RegExp(`^\\d{${cvcLength}}$`).test(cvc) : !/^\d{3,4}$/.test(cvc)) {
    errors.cvc = brand ? `Enter the ${cvcLength} digit security code.` : 'Enter the 3 or 4 digit code.'
  }
  return errors
}
