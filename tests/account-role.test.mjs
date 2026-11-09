// Account role rules (US 2.4.2): who counts as signed out, not chosen, personal or business.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveRole, accountLabel } from '../lib/account/role.ts'
import { readDevRole, DEV_ROLE_COOKIE } from '../lib/account/dev-role.ts'

const base = { signedIn: true, accountType: null, readFailed: false, devRole: null }

test('signed out ignores the override', () => {
  assert.equal(resolveRole({ signedIn: false, accountType: 'business', readFailed: false, devRole: 'personal' }), 'signed-out')
})

test('the override beats a failed read and the stored type', () => {
  assert.equal(resolveRole({ ...base, accountType: 'personal', readFailed: true, devRole: 'business' }), 'business')
  assert.equal(resolveRole({ ...base, accountType: 'personal', devRole: 'unchosen' }), 'unchosen')
})

test('a failed read is shown as personal, so nobody is stuck on the choice screen', () => {
  assert.equal(resolveRole({ ...base, readFailed: true }), 'personal')
})

test('the stored type wins, and no type means not chosen', () => {
  assert.equal(resolveRole({ ...base, accountType: 'business' }), 'business')
  assert.equal(resolveRole({ ...base, accountType: 'personal' }), 'personal')
  assert.equal(resolveRole(base), 'unchosen')
})

test('account labels', () => {
  assert.equal(accountLabel('personal'), 'Personal account')
  assert.equal(accountLabel('business'), 'Business account')
  assert.equal(accountLabel('unchosen'), null)
  assert.equal(accountLabel('signed-out'), null)
})

test('the dev cookie only counts in development, with an exact value', () => {
  assert.equal(DEV_ROLE_COOKIE, 'lh_dev_role')
  for (const v of ['unchosen', 'personal', 'business']) assert.equal(readDevRole(v, 'development'), v)
  for (const env of ['production', 'test', undefined]) assert.equal(readDevRole('personal', env), null)
  for (const v of [undefined, 'admin', 'Personal', ' personal', '']) assert.equal(readDevRole(v, 'development'), null)
})
