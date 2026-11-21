// Tests for lib/quick-dates.ts. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { quickDateRanges } = await import('../lib/quick-dates.ts')

const byLabel = (today) => Object.fromEntries(quickDateRanges(today).map((r) => [r.label, [r.checkIn, r.checkOut]]))

test('labels come in order: this weekend, next weekend, next week', () => {
  assert.deepEqual(
    quickDateRanges('2026-11-18').map((r) => r.label),
    ['This weekend', 'Next weekend', 'Next week'],
  )
})

test('midweek (Wednesday): the coming Friday to Sunday, the one after, and next Monday for 7 nights', () => {
  assert.deepEqual(byLabel('2026-11-18'), {
    'This weekend': ['2026-11-20', '2026-11-22'],
    'Next weekend': ['2026-11-27', '2026-11-29'],
    'Next week': ['2026-11-23', '2026-11-30'],
  })
})

test('Friday: this weekend starts tonight', () => {
  assert.deepEqual(byLabel('2026-11-20')['This weekend'], ['2026-11-20', '2026-11-22'])
  assert.deepEqual(byLabel('2026-11-20')['Next weekend'], ['2026-11-27', '2026-11-29'])
})

test('Saturday: this weekend is just tonight; next weekend is the following Friday', () => {
  assert.deepEqual(byLabel('2026-11-21'), {
    'This weekend': ['2026-11-21', '2026-11-22'],
    'Next weekend': ['2026-11-27', '2026-11-29'],
    'Next week': ['2026-11-23', '2026-11-30'],
  })
})

test('Sunday: the weekend nights are over, so this weekend is the coming one; next week starts tomorrow', () => {
  assert.deepEqual(byLabel('2026-11-22'), {
    'This weekend': ['2026-11-27', '2026-11-29'],
    'Next weekend': ['2026-12-04', '2026-12-06'],
    'Next week': ['2026-11-23', '2026-11-30'],
  })
})

test('Monday: next week is a week away, not today', () => {
  assert.deepEqual(byLabel('2026-11-23')['Next week'], ['2026-11-30', '2026-12-07'])
})

test('ranges cross month and year ends', () => {
  assert.deepEqual(byLabel('2026-12-30'), {
    'This weekend': ['2027-01-01', '2027-01-03'],
    'Next weekend': ['2027-01-08', '2027-01-10'],
    'Next week': ['2027-01-04', '2027-01-11'],
  })
})

test('no range starts before today', () => {
  for (let d = 1; d <= 28; d++) {
    const today = `2026-02-${String(d).padStart(2, '0')}`
    for (const r of quickDateRanges(today)) {
      assert.ok(r.checkIn >= today, `${r.label} from ${today}`)
      assert.ok(r.checkOut > r.checkIn, `${r.label} from ${today}`)
    }
  }
})
