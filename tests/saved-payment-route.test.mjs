// Tests for /api/saved-payment (GET, POST) and /api/saved-payment/[id] (DELETE) — run with `npm test`
import { register } from 'node:module'
import { test, mock, beforeEach, describe } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      if (s === 'next/headers') return next('next/headers.js', c)
      if (s.startsWith('./') && !s.endsWith('.ts') && c.parentURL?.includes('/utils/')) return next(s + '.ts', c)
      return next(s, c)
    }`)
)

const FULL_CARD = '4242424242424242'
const CVC = '987'

let userId
mock.module('next/headers', { namedExports: { cookies: async () => ({ get: () => undefined }) } })
mock.module('@/utils/user', { namedExports: { getUserId: async () => ({ userId }) } })

const createSavedPaymentMethod = mock.fn()
const getSavedPaymentMethodsByAccount = mock.fn()
const deleteSavedPaymentMethod = mock.fn()
mock.module('@/utils/saved-payment-methods', {
  namedExports: { createSavedPaymentMethod, getSavedPaymentMethodsByAccount, deleteSavedPaymentMethod },
})
const consoleError = mock.method(console, 'error', () => {})

const savedRoute = await import('../app/api/saved-payment/route.ts')
const cardRoute = await import('../app/api/saved-payment/[id]/route.ts')

const ROW = {
  id: 'pm-1',
  account_id: 'user-1',
  brand: 'visa',
  last4: '4242',
  exp_month: 12,
  exp_year: 2030,
  name_on_card: 'Alex Rivera',
  is_default: false,
  created_at: '2026-10-01T00:00:00Z',
}

const card = (extra = {}) => ({
  card_number: '4242 4242 4242 4242',
  exp_month: 12,
  exp_year: 2030,
  cvc: CVC,
  name_on_card: 'Alex Rivera',
  time_zone: 'America/Los_Angeles',
  ...extra,
})

async function post(body) {
  const res = await savedRoute.POST(
    new Request('http://localhost/api/saved-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  )
  return { status: res.status, json: await res.json() }
}

async function remove(id) {
  const res = await cardRoute.DELETE(new Request(`http://localhost/api/saved-payment/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id }),
  })
  return { status: res.status, json: res.status === 204 ? null : await res.json() }
}

beforeEach(() => {
  userId = 'user-1'
  for (const fn of [createSavedPaymentMethod, getSavedPaymentMethodsByAccount, deleteSavedPaymentMethod, consoleError]) {
    fn.mock.resetCalls()
  }
  createSavedPaymentMethod.mock.mockImplementation(async (method) => ({ data: [{ ...ROW, ...method, id: 'pm-new' }], error: null }))
  getSavedPaymentMethodsByAccount.mock.mockImplementation(async () => ({ data: [ROW], error: null }))
  deleteSavedPaymentMethod.mock.mockImplementation(async () => ({ deleted: true, error: null }))
})

describe('signed out', () => {
  test('401 for GET, POST and DELETE, nothing read or written', async () => {
    userId = null
    assert.equal((await savedRoute.GET()).status, 401)
    assert.equal((await post(card())).status, 401)
    assert.equal((await remove('pm-1')).status, 401)
    assert.equal(getSavedPaymentMethodsByAccount.mock.callCount(), 0)
    assert.equal(createSavedPaymentMethod.mock.callCount(), 0)
    assert.equal(deleteSavedPaymentMethod.mock.callCount(), 0)
  })
})

describe('GET', () => {
  test("lists the signed-in account's cards with only display fields", async () => {
    const res = await savedRoute.GET()
    const json = await res.json()
    assert.equal(res.status, 200)
    assert.deepEqual(getSavedPaymentMethodsByAccount.mock.calls[0].arguments, ['user-1'])
    assert.deepEqual(json.paymentMethods, [
      { id: 'pm-1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030, name_on_card: 'Alex Rivera', is_default: false },
    ])
  })
})

describe('POST', () => {
  test('saves brand, last 4, expiry and name for the signed-in account, never the number or CVC', async () => {
    const r = await post({ ...card(), account_id: 'someone-else' })
    assert.equal(r.status, 201)
    const saved = createSavedPaymentMethod.mock.calls[0].arguments[0]
    assert.deepEqual(saved, { account_id: 'user-1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030, name_on_card: 'Alex Rivera' })
    const seen = JSON.stringify([r.json, createSavedPaymentMethod.mock.calls.map((c) => c.arguments), consoleError.mock.calls])
    assert.equal(seen.includes(FULL_CARD), false)
    assert.equal(seen.includes(CVC), false)
  })

  test('the decline test cards cannot be saved', async () => {
    for (const [number, error] of [
      ['4000 0000 0000 0002', 'Your card was declined.'],
      ['4000000000009995', 'Insufficient funds.'],
    ]) {
      const r = await post(card({ card_number: number }))
      assert.deepEqual(r, { status: 402, json: { error } })
    }
    assert.equal(createSavedPaymentMethod.mock.callCount(), 0)
  })

  test('an invalid or expired card: 400, nothing saved', async () => {
    assert.equal((await post(card({ card_number: '4242 4242 4242 4241' }))).status, 400)
    const expired = await post(card({ exp_month: 1, exp_year: 2020 }))
    assert.deepEqual(expired, { status: 400, json: { error: 'This card has expired.' } })
    assert.equal(createSavedPaymentMethod.mock.callCount(), 0)
  })

  test('400 on a body that is not a JSON object', async () => {
    for (const body of ['{nope', 'null', '[]']) assert.equal((await post(body)).status, 400, body)
  })

  test('409 for a card already saved; other errors are logged by code only', async () => {
    createSavedPaymentMethod.mock.mockImplementation(async () => ({ data: null, error: { code: '23505' } }))
    assert.equal((await post(card())).status, 409)
    createSavedPaymentMethod.mock.mockImplementation(async () => ({ data: null, error: { code: 'XX000', details: 'row 4242' } }))
    assert.equal((await post(card())).status, 500)
    assert.deepEqual(consoleError.mock.calls[0].arguments[1], { code: 'XX000' })
  })
})

describe('DELETE', () => {
  test('removes the card scoped to the signed-in account', async () => {
    const r = await remove('pm-1')
    assert.equal(r.status, 204)
    assert.deepEqual(deleteSavedPaymentMethod.mock.calls[0].arguments, ['pm-1', 'user-1'])
  })

  test("404 when nothing was deleted (another account's card or no such card)", async () => {
    deleteSavedPaymentMethod.mock.mockImplementation(async () => ({ deleted: false, error: null }))
    assert.deepEqual(await remove('pm-2'), { status: 404, json: { error: 'Saved card not found.' } })
  })

  test('404 for an id that is not a uuid, 500 for other database errors', async () => {
    deleteSavedPaymentMethod.mock.mockImplementation(async () => ({ deleted: false, error: { code: '22P02' } }))
    assert.equal((await remove('not-a-uuid')).status, 404)
    deleteSavedPaymentMethod.mock.mockImplementation(async () => ({ deleted: false, error: { code: 'XX000' } }))
    assert.equal((await remove('pm-1')).status, 500)
  })
})
