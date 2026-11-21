import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STAY_DISCOUNTS,
  activityLabel,
  discountPoints,
  findDiscount,
  formatActivityDate,
  formatPoints,
  historyFilter,
  historyPage,
  matchesFilter,
  pageCount,
  pageList,
  pointsNeeded,
  pointsNumber,
  pointsCharge,
  pointsShortfall,
  shortfallNote,
  shownPointsParam,
  pointsToDollars,
  rewardPrice,
  signedPoints,
} from '../lib/rewards.ts'

const activity = (more = {}) => ({ id: 't1', type: 'earn', points: 1240, createdAt: '2026-09-18T15:00:00Z', hotelName: 'Casa Maré', ...more })

test('discounts cost 100 points per dollar off the total, matching the Figma numbers', () => {
  assert.equal(discountPoints(25, 1074), 26850)
  assert.equal(discountPoints(50, 1074), 53700)
  assert.equal(discountPoints(75, 1074), 80550)
  assert.equal(discountPoints(100, 1074), 107400)
  assert.equal(pointsToDollars(26850), 268.5)
})

test('the dollars shown always come from the points, so they match what checkout deducts', () => {
  const { points, value } = rewardPrice(findDiscount('quarter-off'), 999.99)
  assert.equal(points, 25000)
  assert.equal(value, pointsToDollars(points))
})

test('no total yet means a discount costs nothing and saves nothing', () => {
  assert.equal(discountPoints(25, 0), 0)
  assert.equal(discountPoints(25, Number.NaN), 0)
  assert.deepEqual(rewardPrice(STAY_DISCOUNTS[0], 0), { points: 0, value: 0 })
})

test('a discount never costs more than the whole stay', () => {
  assert.equal(discountPoints(150, 200), 20000)
})

test('there are four discounts, from 25% off to a free stay', () => {
  assert.deepEqual(STAY_DISCOUNTS.map((d) => d.percent), [25, 50, 75, 100])
})

test('findDiscount returns null for unknown or missing ids', () => {
  assert.equal(findDiscount('three-quarters-off').percent, 75)
  assert.equal(findDiscount('free-stay').percent, 100)
  assert.equal(findDiscount('breakfast'), null)
  assert.equal(findDiscount(null), null)
})

test('pointsNeeded is what is missing from the balance, never negative', () => {
  assert.equal(pointsNeeded(40450, 53700), 13250)
  assert.equal(pointsNeeded(40450, 2800), 0)
})

test('points are shown whole, with thousands separators and a sign', () => {
  assert.equal(pointsNumber(13250.4), '13,250')
  assert.equal(formatPoints(40450), '40,450 pts')
  assert.equal(signedPoints(1240), '+ 1,240 pts')
  assert.equal(signedPoints(-2000), '− 2,000 pts')
})

test('history filters split by sign: earned and refunds are positive, redeemed is negative', () => {
  const earned = activity()
  const refund = activity({ type: 'refund', points: 500 })
  const used = activity({ type: 'redeem', points: -2000 })
  const takenBack = activity({ type: 'adjust', points: -100 })
  assert.deepEqual([earned, refund, used, takenBack].filter((a) => matchesFilter(a, 'earned')), [earned, refund])
  assert.deepEqual([earned, refund, used, takenBack].filter((a) => matchesFilter(a, 'redeemed')), [used, takenBack])
  assert.equal([earned, used].filter((a) => matchesFilter(a, 'all')).length, 2)
})

test('activity labels name the hotel when the booking still exists', () => {
  assert.equal(activityLabel(activity()), 'Completed stay · Casa Maré')
  assert.equal(activityLabel(activity({ type: 'redeem', points: -2000 })), 'Points used · Casa Maré')
  assert.equal(activityLabel(activity({ type: 'refund', hotelName: null })), 'Cancellation refund')
})

test('URL params fall back to all activity and page 1', () => {
  assert.equal(historyFilter('earned'), 'earned')
  assert.equal(historyFilter('redeemed'), 'redeemed')
  assert.equal(historyFilter('bogus'), 'all')
  assert.equal(historyFilter(['earned']), 'all')
  assert.equal(historyFilter(undefined), 'all')
  assert.equal(historyPage('3'), 3)
  assert.equal(historyPage('0'), 1)
  assert.equal(historyPage('-2'), 1)
  assert.equal(historyPage('two'), 1)
  assert.equal(historyPage(undefined), 1)
  // A huge page would ask the database for an absurd offset
  assert.equal(historyPage('999999'), 999999)
  assert.equal(historyPage('1000000'), 1)
  assert.equal(historyPage('9'.repeat(400)), 1)
})

test('activity dates use the guest’s time zone, falling back to UTC', () => {
  const lateNightUtc = '2026-09-19T02:00:00Z'
  assert.equal(formatActivityDate(lateNightUtc, 'America/Los_Angeles'), 'Sep 18, 2026')
  assert.equal(formatActivityDate(lateNightUtc, null), 'Sep 19, 2026')
  assert.equal(formatActivityDate(lateNightUtc, 'Not/AZone'), 'Sep 19, 2026')
  assert.equal(formatActivityDate('nope'), '')
})

test('history has 10 rows per page and always at least one page', () => {
  assert.equal(pageCount(0), 1)
  assert.equal(pageCount(10), 1)
  assert.equal(pageCount(11), 2)
})

test('page links show the ends and the neighbours, with … for longer gaps', () => {
  assert.deepEqual(pageList(1, 1), [1])
  assert.deepEqual(pageList(2, 3), [1, 2, 3])
  assert.deepEqual(pageList(5, 20), [1, null, 4, 5, 6, null, 20])
  assert.deepEqual(pageList(1, 20), [1, 2, null, 20])
  assert.deepEqual(pageList(20, 20), [1, null, 19, 20])
  assert.deepEqual(pageList(4, 7), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(pageList(4, 8), [1, 2, 3, 4, 5, null, 8])
})

test('the points checkout showed come back from the URL only as a positive whole number', () => {
  assert.equal(shownPointsParam('26850'), 26850)
  assert.equal(shownPointsParam('0'), null)
  assert.equal(shownPointsParam('-5'), null)
  assert.equal(shownPointsParam('12.5'), null)
  assert.equal(shownPointsParam(['26850']), null)
  assert.equal(shownPointsParam(undefined), null)
})

test('a shortfall is only reported when fewer points were spent than shown', () => {
  assert.equal(pointsShortfall(26850, 20000), 6850)
  assert.equal(pointsShortfall(26850, 26850), 0)
  assert.equal(pointsShortfall(null, 0), 0)
})

test('the confirmation only says the card was charged when it was', () => {
  assert.match(shortfallNote(500, 12.5), /The difference was charged to your card\./)
  for (const charged of [0, null]) {
    const note = shortfallNote(500, charged)
    assert.doesNotMatch(note, /charged/)
    assert.match(note, /room price was lower, so fewer points were needed/)
  }
})

test('the card pays what points leave, with points capped at the balance and the total like checkout_reservation', () => {
  assert.equal(pointsCharge(38997, 50000, 389.97), 0)
  assert.equal(pointsCharge(38997, 10000, 389.97), 289.97)
  assert.equal(pointsCharge(99999, 99999, 389.97), 0)
  assert.equal(pointsCharge(0, 50000, 389.97), 389.97)
  assert.equal(pointsCharge(9749, 50000, 389.97), 292.48)
})
