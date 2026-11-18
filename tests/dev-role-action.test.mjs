// setDevRole (US 2.4.2): the dev-only role switch. Cookies and Next are mocked.
import { register } from 'node:module'
import { test, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = new URL('../', import.meta.url).href
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
      if (s.startsWith('@/')) return next(new URL(s.slice(2) + '.ts', ${JSON.stringify(ROOT)}).href, c)
      if (s === 'next/headers' || s === 'next/navigation' || s === 'next/cache') return next(s + '.js', c)
      return next(s, c)
    }`)
)

const cookieSet = mock.fn()
const cookieDelete = mock.fn()
const revalidatePath = mock.fn()
const redirect = mock.fn((url) => {
  throw Object.assign(new Error('NEXT_REDIRECT'), { url })
})
mock.module('next/headers', { namedExports: { cookies: async () => ({ set: cookieSet, delete: cookieDelete }) } })
mock.module('next/navigation', { namedExports: { redirect } })
mock.module('next/cache', { namedExports: { revalidatePath } })

const { setDevRole } = await import('../app/_components/dev-role-actions.ts')

const form = (role) => {
  const f = new FormData()
  f.set('role', role)
  return f
}
const oldEnv = process.env.NODE_ENV
beforeEach(() => {
  process.env.NODE_ENV = 'development'
  for (const m of [cookieSet, cookieDelete, revalidatePath, redirect]) m.mock.resetCalls()
})
afterEach(() => {
  process.env.NODE_ENV = oldEnv
})
const writes = () => cookieSet.mock.callCount() + cookieDelete.mock.callCount() + revalidatePath.mock.callCount() + redirect.mock.callCount()

for (const env of ['production', 'test']) {
  test(`does nothing with NODE_ENV=${env}`, async () => {
    process.env.NODE_ENV = env
    await setDevRole(form('business'))
    assert.equal(writes(), 0)
  })
}

test('personal sets the cookie and refreshes the layout', async () => {
  await setDevRole(form('personal'))
  assert.deepEqual(cookieSet.mock.calls[0].arguments.slice(0, 2), ['lh_dev_role', 'personal'])
  assert.deepEqual(revalidatePath.mock.calls[0].arguments, ['/', 'layout'])
  assert.equal(redirect.mock.callCount(), 0)
})

test('real clears the cookie', async () => {
  await setDevRole(form('real'))
  assert.deepEqual(cookieDelete.mock.calls[0].arguments, ['lh_dev_role'])
  assert.equal(cookieSet.mock.callCount(), 0)
})

test('not chosen sets the cookie and goes to the choice screen', async () => {
  const err = await setDevRole(form('unchosen')).catch((e) => e)
  assert.equal(err.url, '/account-type')
  assert.deepEqual(cookieSet.mock.calls[0].arguments.slice(0, 2), ['lh_dev_role', 'unchosen'])
})

test('junk is ignored', async () => {
  await setDevRole(form('admin'))
  assert.equal(writes(), 0)
})
