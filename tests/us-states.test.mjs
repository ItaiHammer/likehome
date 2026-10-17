import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stateFromZip, stateName } from '../lib/us-states.ts'

test('a US hotel\'s state comes from the front of its LiteAPI zip', () => {
  assert.equal(stateFromZip('NV 89109'), 'Nevada')
  assert.equal(stateFromZip(' NM 87701 '), 'New Mexico')
  // The hotel list gives the zip without the state
  assert.equal(stateFromZip('89109'), null)
  assert.equal(stateFromZip('XX 12345'), null)
  assert.equal(stateFromZip(''), null)
  assert.equal(stateFromZip(undefined), null)
})

test('state codes become full names, and anything else is not a state', () => {
  assert.equal(stateName('FL'), 'Florida')
  assert.equal(stateName('fl'), 'Florida')
  assert.equal(stateName('D.C.'), 'District of Columbia')
  assert.equal(stateName('Florida'), null)
  assert.equal(stateName(null), null)
})
