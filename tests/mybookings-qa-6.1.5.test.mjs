// QA 6.1.5 – My Bookings dashboard fixes
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const { transactionDisplay } = await import('../lib/bookings.ts')

const row = (over) => ({
  transaction_id: 'tx-1',
  created_at: '2026-11-10T08:00:00Z',
  transaction_type: 'charge',
  amount: '300.00',
  status: 'completed',
  hotel_name: 'Seaside Inn',
  ...over,
})

test('D1: the id comes from transaction_id, the column get_transaction_history returns', () => {
  assert.equal(transactionDisplay(row()).id, 'tx-1')
})

test('D2: each transaction type the DB allows reads as itself', () => {
  assert.deepEqual(
    [row(), row({ transaction_type: 'insurance', amount: 25 }), row({ transaction_type: 'credit' })].map((r) => {
      const t = transactionDisplay(r)
      return [t.title, t.status]
    }),
    [
      ['Booking payment', 'Paid'],
      ['Cancellation insurance', 'Paid'],
      ['Refund', 'Refunded'],
    ],
  )
})

test('D2: pending and failed read as words, and the subtitle names the hotel', () => {
  assert.equal(transactionDisplay(row({ status: 'pending' })).status, 'Pending')
  assert.equal(transactionDisplay(row({ status: 'failed' })).status, 'Failed')
  assert.equal(transactionDisplay(row()).subtitle, 'Seaside Inn · $300 · 2026-11-10')
  assert.equal(transactionDisplay(row({ hotel_name: null })).subtitle, '$300 · 2026-11-10')
})

// utils/history.ts imports next/headers, so its toBooking is checked by source
test('D4: a past stay at a hotel that is gone has no Rebook button', () => {
  const src = readFileSync(new URL('../utils/history.ts', import.meta.url), 'utf8')
  assert.match(src, /unlisted: !row\.hotel_id \|\| !row\.hotel_name/)
  const card = readFileSync(new URL('../app/MyBookings/_components/PastBooking.tsx', import.meta.url), 'utf8')
  assert.match(card, /!booking\.unlisted/)
})

test('D3, D5, D6: the page loads hotels only for Saved, and has no dead buttons', () => {
  const page = readFileSync(new URL('../app/MyBookings/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /withHotels \? getHotels\(\)/)
  assert.match(page, /loadMyBookings\(activeTab === "saved"\)/)
  assert.doesNotMatch(page, /View all &rarr;/)
  assert.doesNotMatch(page, /aria-labelledby="(saved|account)-heading"/)
  const upcoming = readFileSync(new URL('../app/MyBookings/_components/UpcomingBooking.tsx', import.meta.url), 'utf8')
  assert.match(upcoming, /disabled\s+title="Coming soon"/)
})
