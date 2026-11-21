import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visiblePages } from '../lib/pagination.ts'

test('page links show the ends and the neighbours of the current page, in order', () => {
  assert.deepEqual(visiblePages(1, 1), [1])
  assert.deepEqual(visiblePages(2, 3), [1, 2, 3])
  assert.deepEqual(visiblePages(5, 20), [1, 4, 5, 6, 20])
  assert.deepEqual(visiblePages(1, 20), [1, 2, 20])
  assert.deepEqual(visiblePages(20, 20), [1, 19, 20])
  assert.deepEqual(visiblePages(4, 8), [1, 3, 4, 5, 8])
})
