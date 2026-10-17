import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stateFromZip, stateName, stateNamed } from '../lib/us-states.ts'

test('a US hotel\'s state comes from the front of its LiteAPI zip', () => {
  assert.equal(stateFromZip('NV 89109'), 'Nevada')
  assert.equal(stateFromZip(' NM 87701 '), 'New Mexico')
  // Without the state, as the hotel list and many hotel details give it
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

test('a full state name is a state, except Georgia, which is also a country', () => {
  assert.equal(stateNamed('new york'), 'New York')
  assert.equal(stateNamed(' District of Columbia '), 'District of Columbia')
  assert.equal(stateNamed('Georgia'), null)
  assert.equal(stateNamed('France'), null)
  assert.equal(stateNamed('FL'), null)
  assert.equal(stateNamed(undefined), null)
})
