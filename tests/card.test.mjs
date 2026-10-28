import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardErrors } from '../lib/card.ts'

const NOW = new Date('2026-10-11T12:00:00Z')

test('the test cards from /api/checkout pass the card checks', () => {
  assert.deepEqual(cardErrors('4242 4242 4242 4242', '12/30', '123', NOW), {})
  assert.deepEqual(cardErrors('4000 0000 0000 0002', '12/30', '123', NOW), {})
  assert.deepEqual(cardErrors('4000 0000 0000 9995', '12/30', '123', NOW), {})
})

test('a mistyped or unsupported card number is caught', () => {
  assert.equal(cardErrors('4242 4242 4242 4241', '12/30', '123', NOW).cardNumber, 'Enter a valid card number.')
  assert.equal(cardErrors('1234', '12/30', '123', NOW).cardNumber, 'Enter a valid card number.')
  // Passes the checksum but isn't a brand the API takes
  assert.equal(cardErrors('3530 1113 3330 0000', '12/30', '123', NOW).cardNumber, 'We accept Visa, Mastercard, American Express and Discover.')
})

test('expiry must be MM/YY and not before this month', () => {
  assert.equal(cardErrors('4242424242424242', '1/30', '123', NOW).expiry, 'Use the format MM/YY.')
  assert.equal(cardErrors('4242424242424242', '13/30', '123', NOW).expiry, 'Use the format MM/YY.')
  assert.equal(cardErrors('4242424242424242', '09/26', '123', NOW).expiry, 'This card has expired.')
  assert.equal(cardErrors('4242424242424242', '10/26', '123', NOW).expiry, undefined)
})

test('security code is 4 digits for Amex and 3 for other cards', () => {
  assert.equal(cardErrors('3782 822463 10005', '12/30', '1234', NOW).cvc, undefined)
  assert.equal(cardErrors('3782 822463 10005', '12/30', '123', NOW).cvc, 'Enter the 4 digit security code.')
  assert.equal(cardErrors('4242424242424242', '12/30', '1234', NOW).cvc, 'Enter the 3 digit security code.')
  assert.equal(cardErrors('1234', '12/30', '12', NOW).cvc, 'Enter the 3 or 4 digit code.')
})
