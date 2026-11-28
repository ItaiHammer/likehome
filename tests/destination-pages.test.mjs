import test from 'node:test'
import assert from 'node:assert/strict'
import { destinationPageCount, destinationPageStart } from '../lib/destination-pages.ts'

test('nine destinations paginate at all viewport sizes', () => {
  assert.equal(destinationPageCount(9, 3), 3)
  assert.equal(destinationPageCount(9, 2), 5)
  assert.equal(destinationPageCount(9, 1), 9)
})

test('pages do not overlap or repeat any destination', () => {
  assert.deepEqual([0, 1, 2].map((p) => destinationPageStart(p, 9, 3)), [0, 3, 6])
  assert.equal(destinationPageStart(4, 9, 3), 6)
  assert.equal(destinationPageStart(-2, 9, 3), 0)
  assert.equal(destinationPageStart(0, 2, 3), 0)

  for (const size of [1, 2, 3, 4]) {
    const indices = Array.from({ length: destinationPageCount(9, size) }, (_, page) =>
      Array.from({ length: Math.min(size, 9 - destinationPageStart(page, 9, size)) }, (_, i) =>
        destinationPageStart(page, 9, size) + i,
      ),
    ).flat()
    assert.deepEqual(indices, [0, 1, 2, 3, 4, 5, 6, 7, 8], `page size ${size}`)
  }
})


import { readFileSync } from 'node:fs'

// The destination lists use Next.js image imports, so count the typed source
// entries without loading Next in this dependency-free regression test.
test('each homepage tab has nine distinct destinations with a full final row', () => {
  const source = readFileSync(new URL('../app/_data/destinations.ts', import.meta.url), 'utf8')
  for (const tab of ['near', 'national', 'international']) {
    const block = source.match(new RegExp('\\b' + tab + ': \\[([\\s\\S]*?)\\n  \\]'))
    assert.ok(block, `missing ${tab} destination list`)
    const names = [...block[1].matchAll(/\{ name: "([^"]+)"/g)].map((match) => match[1])
    assert.equal(names.length, 9, `${tab} should have nine destination cards`)
    assert.equal(new Set(names).size, 9, `${tab} should not repeat destinations`)
  }
})
