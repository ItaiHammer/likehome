// QA 3.1.5 – search fixes: state codes, 0 adults
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

mock.module('../utils/search.ts', {
  namedExports: { searchAvailableHotels: mock.fn(async (args) => ({ data: [], total: 0, args })) },
})
const { search } = await import('../app/search/search.ts')
const sent = async (input) => (await search(input)).results.args

test('S1: "City, ST" searches the US state, like "City, State"', async () => {
  for (const where of ['Austin, TX', 'Austin, tx', 'Austin, T.X.', 'Austin, Texas']) {
    const args = await sent({ where })
    assert.equal(args.city, 'Austin', where)
    assert.equal(args.region, 'Texas', where)
    assert.equal(args.country, 'USA', where)
  }
  const ny = await sent({ where: 'New York, NY' })
  assert.deepEqual([ny.city, ny.region, ny.country], ['New York', 'New York', 'USA'])
})

test('S1: two-letter country codes that are not states still go through as countries', async () => {
  assert.equal((await sent({ where: 'London, UK' })).country, 'United Kingdom')
  assert.equal((await sent({ where: 'Paris, FR' })).country, 'FR')
  assert.equal((await sent({ where: 'Paris, France' })).region, undefined)
})

test('S6: 0 adults is not sent as a party of 0 adults', async () => {
  const args = await sent({ adults: '0', children: '2' })
  assert.equal(args.adults, undefined)
  assert.equal(args.children, 2)
  assert.equal(args.guests, 2)
})
