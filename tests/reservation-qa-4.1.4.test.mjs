// QA 4.1.4 – quick reservation fixes: account type screen, card expiry upper limit
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const { nextPath, parseAccountType } = await import('../lib/account-type.ts')
const { validatePaymentInput, MAX_CARD_YEARS } = await import('../utils/payment-logic.ts')
const { cardErrors } = await import('../lib/card.ts')
const { PAGE_ROUTES } = await import('../constants/routes.ts')

test('R1: the page the proxy sends new accounts to exists', () => {
  assert.equal(PAGE_ROUTES.ACCOUNT_TYPE, '/account-type')
  assert.ok(existsSync(new URL('../app/account-type/page.tsx', import.meta.url)))
  const action = readFileSync(new URL('../app/account-type/actions.ts', import.meta.url), 'utf8')
  assert.match(action, /setAccountType\(type\)/)
})

test('R1: only personal and business are accepted', () => {
  assert.equal(parseAccountType('personal'), 'personal')
  assert.equal(parseAccountType('business'), 'business')
  for (const bad of ['admin', '', null, undefined, 'Personal']) assert.equal(parseAccountType(bad), null)
})

test('R1: after choosing, the guest goes back where they were headed (e.g. their booking confirmation)', () => {
  assert.equal(nextPath('/MyBookings/abc/confirmed', 'personal'), '/MyBookings/abc/confirmed')
  assert.equal(nextPath(undefined, 'personal'), '/MyBookings')
  assert.equal(nextPath(undefined, 'business'), '/listings')
})

test('R1: next can never send the user to another site', () => {
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', ['/MyBookings']]) {
    assert.equal(nextPath(bad, 'personal'), '/MyBookings', String(bad))
  }
})

const now = new Date('2026-11-16T12:00:00Z')
const card = (exp_year) => ({ card_number: '4242424242424242', exp_month: 12, exp_year, cvc: '123', name_on_card: 'Test' })

test('R4: an expiry more than 20 years out is refused by the API', () => {
  assert.equal(MAX_CARD_YEARS, 20)
  assert.equal(validatePaymentInput(card(2099), now).ok, false)
  assert.equal(validatePaymentInput(card(99), now).ok, false) // two-digit year → 2099
  assert.equal(validatePaymentInput(card(2046), now).ok, true)
  assert.equal(validatePaymentInput(card(2047), now).ok, false)
})

test('R4: the checkout form shows the same rule under the expiry field', () => {
  assert.equal(cardErrors('4242424242424242', '12/99', '123', now).expiry, 'Check the expiry date.')
  assert.equal(cardErrors('4242424242424242', '12/30', '123', now).expiry, undefined)
})
