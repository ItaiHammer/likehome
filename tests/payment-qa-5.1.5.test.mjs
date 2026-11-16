// QA 5.1.5 – payment fixes
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const { postalCodeError } = await import('../lib/card.ts')

test('P2: billing postal codes from any country are accepted', () => {
  for (const code of ['94105', '94105-1234', 'SW1A 1AA', 'K1A 0B6', '10115', '100-0001', '2000', '  94105 ']) {
    assert.equal(postalCodeError(code), undefined, code)
  }
})

test('P2: empty, too short, too long or odd characters are refused', () => {
  for (const code of ['', '  ', '12', '12345678901', '941!05', '-9410', '9410-']) {
    assert.equal(postalCodeError(code), 'Enter your billing postal code.', JSON.stringify(code))
  }
})

test('P2: the checkout field allows 10 characters and uses the shared check', () => {
  const src = readFileSync(new URL('../app/reserve/[slug]/StayReservation.tsx', import.meta.url), 'utf8')
  assert.match(src, /id="postalCode"[^\n]*maxLength=\{10\}/)
  assert.match(src, /postalCodeError\(text\("postalCode"\)\)/)
})

test('P1: /api/reservations has no POST, so a booking can only be made through paid checkout', () => {
  const src = readFileSync(new URL('../app/api/reservations/route.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /export\s+async\s+function\s+POST/)
  assert.match(src, /export\s+async\s+function\s+GET/)
})
