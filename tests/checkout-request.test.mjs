import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkoutRequest } from '../app/reserve/[slug]/checkoutRequest.ts'
import { validateReservationInput } from '../utils/reservation-logic.ts'
import { validatePaymentInput } from '../utils/payment-logic.ts'

const NOW = new Date('2026-10-11T12:00:00Z')
const TODAY = '2026-10-11'

// The checkout form as a guest fills it in, typed formatting included
const form = (overrides = {}) => ({
  roomId: '7b0c6a2e-3f4d-4e5a-9b8c-1d2e3f4a5b6c',
  checkIn: '2026-11-02',
  checkOut: '2026-11-05',
  adults: 2,
  children: 1,
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/28',
  cvc: '123',
  cardName: 'Test Guest',
  timeZone: 'America/Los_Angeles',
  ...overrides,
})

test('the checkout body passes the /api/checkout stay and card checks', () => {
  const body = checkoutRequest(form())
  const stay = validateReservationInput(body, TODAY)
  assert.equal(stay.ok, true, stay.error)
  assert.deepEqual(stay.value, { room_id: form().roomId, check_in: '2026-11-02', check_out: '2026-11-05', guests: 3, children: 1 })
  const card = validatePaymentInput(body.payment, NOW)
  assert.equal(card.ok, true, card.error)
})

test('every approved test card makes it through, with the right brand and last 4', () => {
  const cards = [
    ['4242 4242 4242 4242', '123', 'visa', '4242'],
    ['5555 5555 5555 4444', '123', 'mastercard', '4444'],
    ['3782 822463 10005', '1234', 'amex', '0005'],
    ['6011 1111 1111 1117', '123', 'discover', '1117'],
  ]
  for (const [cardNumber, cvc, brand, last4] of cards) {
    const card = validatePaymentInput(checkoutRequest(form({ cardNumber, cvc })).payment, NOW)
    assert.equal(card.ok, true, `${cardNumber}: ${card.error}`)
    assert.equal(card.value.brand, brand)
    assert.equal(card.value.last4, last4)
  }
})

test('typed formatting is cleaned up the way the route expects', () => {
  const { payment } = checkoutRequest(form({ cardNumber: '4242-4242 4242-4242', expiry: '03/31' }))
  assert.equal(payment.card_number, '4242424242424242')
  assert.equal(payment.exp_month, 3)
  assert.equal(payment.exp_year, 2031)
  assert.equal(payment.name_on_card, 'Test Guest')
})

test("the guest's time zone is sent, so the API judges \"today\" in it (#79)", () => {
  assert.equal(checkoutRequest(form()).time_zone, 'America/Los_Angeles')
  // Left out when the browser can't tell; the API then falls back to UTC
  assert.equal(checkoutRequest(form({ timeZone: undefined })).time_zone, undefined)
})

test('adults and children are sent together as guests, and the children apart for pricing', () => {
  const body = checkoutRequest(form({ adults: 2, children: 1 }))
  assert.equal(body.guests, 3)
  assert.equal(body.children, 1)
  assert.equal(checkoutRequest(form({ adults: 1, children: 0 })).children, 0)
})
