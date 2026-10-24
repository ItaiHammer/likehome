// Unit tests for utils/payment-logic.ts — run with `npm test`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  authorizeMockPayment,
  detectCardBrand,
  luhnValid,
  validatePaymentInput,
} from '../utils/payment-logic.ts'

const NOW = new Date('2026-10-09T12:00:00Z')
const valid = {
  card_number: '4242 4242 4242 4242',
  exp_month: 12,
  exp_year: 2028,
  cvc: '123',
  name_on_card: 'Alex Rivera',
}

test('valid card passes and returns last 4 and brand', () => {
  const r = validatePaymentInput(valid, NOW)
  assert.equal(r.ok, true)
  assert.deepEqual(r.value, {
    cardNumber: '4242424242424242',
    last4: '4242',
    brand: 'visa',
    expMonth: 12,
    expYear: 2028,
  })
})

test('CVC and name on card are never returned', () => {
  const r = validatePaymentInput(valid, NOW)
  assert.equal(JSON.stringify(r).includes('123'), false)
  assert.equal(JSON.stringify(r).includes('Alex'), false)
})

test('Luhn checksum', () => {
  assert.equal(luhnValid('4242424242424242'), true)
  assert.equal(luhnValid('4000000000000002'), true)
  assert.equal(luhnValid('4000000000009995'), true)
  assert.equal(luhnValid('4242424242424241'), false)
})

test('rejects mistyped or malformed card numbers', () => {
  for (const card_number of ['4242 4242 4242 4241', '1234', 'abcd efgh ijkl mnop', '', undefined]) {
    assert.equal(validatePaymentInput({ ...valid, card_number }, NOW).ok, false, `card=${card_number}`)
  }
})

test('detects card brands', () => {
  assert.equal(detectCardBrand('4242424242424242'), 'visa')
  assert.equal(detectCardBrand('5555555555554444'), 'mastercard')
  assert.equal(detectCardBrand('2223003122003222'), 'mastercard')
  assert.equal(detectCardBrand('378282246310005'), 'amex')
  assert.equal(detectCardBrand('6011111111111117'), 'discover')
  assert.equal(detectCardBrand('3056930009020004'), null)
})

test('rejects expired cards, accepts one expiring this month', () => {
  assert.equal(validatePaymentInput({ ...valid, exp_month: 9, exp_year: 2026 }, NOW).ok, false)
  assert.equal(validatePaymentInput({ ...valid, exp_month: 12, exp_year: 2025 }, NOW).ok, false)
  assert.equal(validatePaymentInput({ ...valid, exp_month: 10, exp_year: 2026 }, NOW).ok, true)
})

test('accepts 2-digit years and string months from form inputs', () => {
  const r = validatePaymentInput({ ...valid, exp_month: '03', exp_year: '29' }, NOW)
  assert.equal(r.ok, true)
  assert.equal(r.value.expMonth, 3)
  assert.equal(r.value.expYear, 2029)
})

test('rejects bad expiry months', () => {
  for (const exp_month of [0, 13, 'ab', undefined]) {
    assert.equal(validatePaymentInput({ ...valid, exp_month }, NOW).ok, false, `month=${exp_month}`)
  }
})

test('amex needs a 4 digit CVC, other cards 3', () => {
  const amex = { ...valid, card_number: '3782 822463 10005' }
  assert.equal(validatePaymentInput({ ...amex, cvc: '123' }, NOW).ok, false)
  assert.equal(validatePaymentInput({ ...amex, cvc: '1234' }, NOW).ok, true)
  assert.equal(validatePaymentInput({ ...valid, cvc: '1234' }, NOW).ok, false)
  assert.equal(validatePaymentInput({ ...valid, cvc: '12' }, NOW).ok, false)
})

test('requires name on card and a payment object', () => {
  assert.equal(validatePaymentInput({ ...valid, name_on_card: '  ' }, NOW).ok, false)
  assert.equal(validatePaymentInput(undefined, NOW).ok, false)
})

test('demo cards approve or decline as documented', () => {
  assert.deepEqual(authorizeMockPayment('4242424242424242', 300), { approved: true })
  assert.deepEqual(authorizeMockPayment('4000000000000002', 300), {
    approved: false,
    reason: 'Your card was declined.',
  })
  assert.deepEqual(authorizeMockPayment('4000000000009995', 300), {
    approved: false,
    reason: 'Insufficient funds.',
  })
  assert.deepEqual(authorizeMockPayment('5555555555554444', 300), { approved: true })
})

test('declines a zero or negative amount', () => {
  assert.equal(authorizeMockPayment('4242424242424242', 0).approved, false)
  assert.equal(authorizeMockPayment('4242424242424242', -5).approved, false)
})

// --- Edge cases ---

/** Appends the Luhn check digit so generated test numbers are valid. */
function withCheckDigit(partial) {
  for (let d = 0; d <= 9; d++) if (luhnValid(partial + d)) return partial + d
}

test('visa lengths: 13, 16 and 19 digits accepted, others rejected', () => {
  assert.equal(detectCardBrand(withCheckDigit('4'.padEnd(12, '1'))), 'visa')
  assert.equal(detectCardBrand(withCheckDigit('4'.padEnd(18, '1'))), 'visa')
  assert.equal(detectCardBrand(withCheckDigit('4'.padEnd(13, '1'))), null)
  assert.equal(validatePaymentInput({ ...valid, card_number: withCheckDigit('4'.padEnd(18, '1')) }, NOW).ok, true)
})

test('mastercard 2-series range boundaries', () => {
  assert.equal(detectCardBrand(withCheckDigit('2221'.padEnd(15, '0'))), 'mastercard')
  assert.equal(detectCardBrand(withCheckDigit('2720'.padEnd(15, '0'))), 'mastercard')
  assert.equal(detectCardBrand(withCheckDigit('2220'.padEnd(15, '0'))), null)
  assert.equal(detectCardBrand(withCheckDigit('2721'.padEnd(15, '0'))), null)
  assert.equal(detectCardBrand(withCheckDigit('5011'.padEnd(15, '0'))), null)
})

test('discover prefixes', () => {
  for (const prefix of ['6011', '644', '649', '65']) {
    assert.equal(detectCardBrand(withCheckDigit(prefix.padEnd(15, '0'))), 'discover', prefix)
  }
  assert.equal(detectCardBrand(withCheckDigit('643'.padEnd(15, '0'))), null)
})

test('unsupported brands get a clear message', () => {
  for (const card_number of ['3566002020360505', '30569309025904']) {
    const r = validatePaymentInput({ ...valid, card_number }, NOW)
    assert.equal(r.ok, false)
    assert.match(r.error, /We accept/)
  }
})

test('card number formats: dashes and spaces ok, anything else rejected', () => {
  assert.equal(validatePaymentInput({ ...valid, card_number: '4242-4242-4242-4242' }, NOW).ok, true)
  assert.equal(validatePaymentInput({ ...valid, card_number: '  4242424242424242  ' }, NOW).ok, true)
  for (const card_number of ['4242.4242.4242.4242', '４２４２４２４２４２４２４２４２', 4242424242424242, '4'.repeat(20)]) {
    assert.equal(validatePaymentInput({ ...valid, card_number }, NOW).ok, false, String(card_number))
  }
})

test('expiry across a year boundary', () => {
  const dec = new Date('2026-12-15T00:00:00Z')
  const jan = new Date('2027-01-01T00:00:00Z')
  assert.equal(validatePaymentInput({ ...valid, exp_month: 12, exp_year: 2026 }, dec).ok, true)
  assert.equal(validatePaymentInput({ ...valid, exp_month: 11, exp_year: 2026 }, dec).ok, false)
  assert.equal(validatePaymentInput({ ...valid, exp_month: 12, exp_year: 2026 }, jan).ok, false)
  assert.equal(validatePaymentInput({ ...valid, exp_month: 1, exp_year: 27 }, jan).ok, true)
})

test('rejects non-integer or missing expiry parts', () => {
  for (const patch of [{ exp_month: 1.5 }, { exp_month: '1.5' }, { exp_year: undefined }, { exp_year: '' }, { exp_year: 'twenty' }]) {
    assert.equal(validatePaymentInput({ ...valid, ...patch }, NOW).ok, false, JSON.stringify(patch))
  }
})

test('CVC must be a string of digits (leading zeros kept)', () => {
  assert.equal(validatePaymentInput({ ...valid, cvc: '012' }, NOW).ok, true)
  assert.equal(validatePaymentInput({ ...valid, cvc: ' 123 ' }, NOW).ok, true)
  for (const cvc of [123, 'abc', '1 23', undefined]) {
    assert.equal(validatePaymentInput({ ...valid, cvc }, NOW).ok, false, String(cvc))
  }
})

test('declined test cards only match the exact number', () => {
  assert.equal(authorizeMockPayment('4000000000000010', 300).approved, true)
})

test('authorizeMockPayment ignores inherited object keys', () => {
  for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.deepEqual(authorizeMockPayment(key, 300), { approved: true }, key)
  }
})

test('declines a non-numeric amount', () => {
  assert.equal(authorizeMockPayment('4242424242424242', NaN).approved, false)
})
