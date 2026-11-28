import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isUuid } from '../lib/ids.ts'
import { isHotelId } from '../lib/saved-hotels.ts'

test('isUuid accepts a uuid in any case and nothing else', () => {
  assert.equal(isUuid('3f2b8c1e-9a4d-4e2b-8f1a-0c9d7e6b5a43'), true)
  assert.equal(isUuid('3F2B8C1E-9A4D-4E2B-8F1A-0C9D7E6B5A43'), true)
  assert.equal(isUuid('coastal-king'), false)
  assert.equal(isUuid(42), false)
  assert.equal(isHotelId('3f2b8c1e-9a4d-4e2b-8f1a-0c9d7e6b5a43'), true)
  assert.equal(isHotelId(null), false)
})
