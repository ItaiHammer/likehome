// Messages frontend: inbox rows, mail badge, header menu, hub filters and paging, previews, times, stay lines
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  badgeLabel,
  bellSummary,
  emptyText,
  filterMessages,
  hubHref,
  hubQuery,
  hubView,
  HUB_PAGE_SIZE,
  mailBadge,
  messageLink,
  messageStay,
  preview,
  regardingLine,
  relativeTime,
  stayLine,
  toInboxMessage,
  toInboxMessages,
  toStayRefs,
  unreadCount,
} from '../lib/messages.ts'
import { pageSlice, visiblePages } from '../lib/pagination.ts'

const row = (overrides = {}) => ({
  id: 'm1',
  hotel_id: 'h1',
  recipient_id: 'g1',
  subject: 'Pool closed Tuesday',
  body: 'The pool will be closed for cleaning.',
  read_at: null,
  created_at: '2026-11-18T09:00:00.123456+00:00',
  hotels: { name: 'Casa del Sol' },
  ...overrides,
})

const inbox = (id, readAt = null, kind = 'direct', extra = {}) => ({
  id,
  hotelId: 'h1',
  hotelName: 'Casa del Sol',
  subject: `Subject ${id}`,
  body: 'Hello',
  createdAt: '2026-11-18T09:00:00Z',
  readAt,
  kind,
  reservationId: null,
  ...extra,
})
const READ = '2026-11-18T10:00:00Z'

test('an API row becomes an inbox message', () => {
  assert.deepEqual(toInboxMessage(row()), {
    id: 'm1',
    hotelId: 'h1',
    hotelName: 'Casa del Sol',
    subject: 'Pool closed Tuesday',
    body: 'The pool will be closed for cleaning.',
    createdAt: '2026-11-18T09:00:00.123456+00:00',
    readAt: null,
    kind: 'direct',
    reservationId: null,
  })
  assert.equal(toInboxMessage(row({ read_at: '2026-11-18T10:00:00Z' })).readAt, '2026-11-18T10:00:00Z')
})

test('the hotel name falls back to "A hotel" when the join is missing or blank', () => {
  assert.equal(toInboxMessage(row({ hotels: undefined })).hotelName, 'A hotel')
  assert.equal(toInboxMessage(row({ hotels: null })).hotelName, 'A hotel')
  assert.equal(toInboxMessage(row({ hotels: { name: '   ' } })).hotelName, 'A hotel')
  assert.equal(toInboxMessage(row({ hotels: { name: 42 } })).hotelName, 'A hotel')
  assert.equal(toInboxMessage(row({ hotels: [{ name: 'Harbor Inn' }] })).hotelName, 'Harbor Inn')
  assert.equal(toInboxMessage(row({ hotels: { name: '  Harbor Inn ' } })).hotelName, 'Harbor Inn')
})

test('a row without an id, subject or created_at is not a message', () => {
  assert.equal(toInboxMessage(row({ id: undefined })), null)
  assert.equal(toInboxMessage(row({ id: '' })), null)
  assert.equal(toInboxMessage(row({ id: 7 })), null)
  assert.equal(toInboxMessage(row({ subject: null })), null)
  assert.equal(toInboxMessage(row({ subject: '   ' })), null)
  assert.equal(toInboxMessage(row({ created_at: undefined })), null)
  for (const odd of [null, undefined, 'm1', 42, [], [row()]]) assert.equal(toInboxMessage(odd), null)
})

test('kind reads as direct unless the row says promotional, so rows from before the column work', () => {
  assert.equal(toInboxMessage(row()).kind, 'direct')
  assert.equal(toInboxMessage(row({ kind: null })).kind, 'direct')
  assert.equal(toInboxMessage(row({ kind: 'spam' })).kind, 'direct')
  assert.equal(toInboxMessage(row({ kind: 'direct' })).kind, 'direct')
  assert.equal(toInboxMessage(row({ kind: 'promotional' })).kind, 'promotional')
})

test('reservation_id is carried when present and null otherwise', () => {
  assert.equal(toInboxMessage(row({ reservation_id: 'r1' })).reservationId, 'r1')
  assert.equal(toInboxMessage(row({ reservation_id: null })).reservationId, null)
  assert.equal(toInboxMessage(row({ reservation_id: '' })).reservationId, null)
})

test('a message the traveler deleted (hidden_at set) is left out everywhere', () => {
  assert.equal(toInboxMessage(row({ hidden_at: '2026-11-19T10:00:00Z' })), null)
  assert.notEqual(toInboxMessage(row({ hidden_at: null })), null)
  const list = toInboxMessages([row({ id: 'a' }), row({ id: 'b', hidden_at: '2026-11-19T10:00:00Z' })])
  assert.deepEqual(list.map((m) => m.id), ['a'])
})

test('odd optional fields still give a usable message', () => {
  const m = toInboxMessage(row({ hotel_id: null, body: undefined, read_at: '' }))
  assert.equal(m.hotelId, '')
  assert.equal(m.body, '')
  assert.equal(m.readAt, null)
})

test('a list of rows keeps its order and drops the bad ones', () => {
  const list = toInboxMessages([row({ id: 'a' }), null, row({ id: 'b', subject: '' }), 'junk', row({ id: 'c' })])
  assert.deepEqual(list.map((m) => m.id), ['a', 'c'])
  for (const odd of [null, undefined, {}, 'rows', { data: [row()] }]) assert.deepEqual(toInboxMessages(odd), [])
  assert.deepEqual(toInboxMessages([]), [])
})

test('only unread messages count toward the badge', () => {
  assert.equal(unreadCount([inbox('a'), inbox('b', '2026-11-18T10:00:00Z'), inbox('c')]), 2)
  assert.equal(unreadCount([inbox('a', '2026-11-18T10:00:00Z')]), 0)
  assert.equal(unreadCount([]), 0)
  assert.equal(unreadCount(undefined), 0)
})

test('the badge is empty at zero, shows 1 to 9, and caps at 9+', () => {
  assert.equal(badgeLabel(0), '')
  assert.equal(badgeLabel(-3), '')
  assert.equal(badgeLabel(Number.NaN), '')
  assert.equal(badgeLabel(1), '1')
  assert.equal(badgeLabel(9), '9')
  assert.equal(badgeLabel(10), '9+')
  assert.equal(badgeLabel(250), '9+')
})

test('a short preview is the body on one line with spaces tidied', () => {
  assert.equal(preview('Hello there'), 'Hello there')
  assert.equal(preview('  Dear guest,\n\nThe pool\tis   closed.\r\n  '), 'Dear guest, The pool is closed.')
  assert.equal(preview(''), '')
  assert.equal(preview('   \n  '), '')
  assert.equal(preview(undefined), '')
  assert.equal(preview(null), '')
})

test('a long preview is cut at a word with an ellipsis and never runs past the limit', () => {
  assert.equal(preview('The pool will be closed on Tuesday', 20), 'The pool will be…')
  assert.equal(preview('The pool will be closed on Tuesday', 20).length <= 20, true)
  // the cut lands right at the end of a word, so that word stays
  assert.equal(preview('one two three four', 8), 'one two…')
  assert.equal(preview('Checkout is late, breakfast is early', 18), 'Checkout is late…')
  assert.equal(preview('Supercalifragilisticexpialidocious', 10), 'Supercali…')
})

test('the preview limit defaults to 90 characters', () => {
  const body = 'word '.repeat(40)
  const result = preview(body)
  assert.equal(result.length <= 90, true)
  assert.equal(result.endsWith('…'), true)
  assert.equal(result.startsWith('word word'), true)
  assert.equal(result.includes('wor…'), false)
  const exact = 'x'.repeat(90)
  assert.equal(preview(exact), exact)
})

test('the header menu counts unread per kind over the whole inbox and carries the newest three of each', () => {
  const long = 'word '.repeat(60)
  const list = [
    ...Array.from({ length: 5 }, (_, i) => ({ ...inbox(`d${i}`, i < 4 ? READ : null), body: long })),
    inbox('p0', null, 'promotional'),
    inbox('p1', READ, 'promotional'),
    inbox('p2', null, 'promotional'),
    inbox('p3', null, 'promotional'),
  ]
  const summary = bellSummary(list)
  // the one unread Direct is past the third, so the count can't come from the three alone
  assert.equal(summary.unreadDirect, 1)
  assert.equal(summary.unreadPromotional, 3)
  assert.deepEqual(summary.direct.map((m) => m.id), ['d0', 'd1', 'd2'])
  assert.deepEqual(summary.promotional.map((m) => m.id), ['p0', 'p1', 'p2'])
  assert.deepEqual(summary.direct[0], { ...list[0], body: preview(long) })
  assert.equal(list[0].body, long)
})

test('the header menu keeps inbox order (newest first) within each kind', () => {
  const list = [inbox('p-new', null, 'promotional'), inbox('d-new'), inbox('p-old', null, 'promotional'), inbox('d-old')]
  const summary = bellSummary(list)
  assert.deepEqual(summary.direct.map((m) => m.id), ['d-new', 'd-old'])
  assert.deepEqual(summary.promotional.map((m) => m.id), ['p-new', 'p-old'])
})

test('the header menu takes another limit and copes with an empty or missing inbox', () => {
  const list = [inbox('a'), inbox('b'), inbox('c', READ)]
  assert.equal(bellSummary(list, 1).direct.length, 1)
  assert.equal(bellSummary(list, 0).direct.length, 0)
  assert.equal(bellSummary(list, 0).unreadDirect, 2)
  assert.equal(bellSummary(list, Number.NaN).direct.length, 3)
  const empty = { unreadDirect: 0, unreadPromotional: 0, direct: [], promotional: [] }
  assert.deepEqual(bellSummary([]), empty)
  assert.deepEqual(bellSummary(undefined), empty)
})

test('the mail badge shows the unread Direct count, capped at 9+', () => {
  assert.deepEqual(mailBadge({ unreadDirect: 3, unreadPromotional: 0 }), { count: '3', dot: false, label: 'Messages, 3 unread' })
  assert.deepEqual(mailBadge({ unreadDirect: 12, unreadPromotional: 0 }), { count: '9+', dot: false, label: 'Messages, 12 unread' })
})

test('the mail badge is a dot when only Promotional is unread, and Direct wins when both are', () => {
  assert.deepEqual(mailBadge({ unreadDirect: 0, unreadPromotional: 2 }), { count: '', dot: true, label: 'Messages, new offers' })
  assert.deepEqual(mailBadge({ unreadDirect: 1, unreadPromotional: 5 }), { count: '1', dot: false, label: 'Messages, 1 unread' })
  assert.deepEqual(mailBadge({ unreadDirect: 0, unreadPromotional: 0 }), { count: '', dot: false, label: 'Messages' })
  assert.deepEqual(mailBadge(undefined), { count: '', dot: false, label: 'Messages' })
})

test('the hub view reads type, unread and page from the search params', () => {
  assert.deepEqual(hubView({}), { kind: 'all', unread: false, page: 1 })
  assert.deepEqual(hubView({ type: 'direct', unread: '1', page: '3' }), { kind: 'direct', unread: true, page: 3 })
  assert.deepEqual(hubView({ type: 'promotional' }), { kind: 'promotional', unread: false, page: 1 })
  assert.deepEqual(hubView({ type: 'other', unread: 'yes', page: '-2' }), { kind: 'all', unread: false, page: 1 })
  assert.deepEqual(hubView({ type: ['direct'], page: ['2'] }), { kind: 'all', unread: false, page: 1 })
  assert.deepEqual(hubView(undefined), { kind: 'all', unread: false, page: 1 })
})

test('the hub query leaves out defaults, and round-trips through hubView', () => {
  assert.equal(hubQuery({ kind: 'all', unread: false, page: 1 }), '')
  assert.equal(hubQuery({ kind: 'direct', unread: true, page: 2 }), '?type=direct&unread=1&page=2')
  assert.equal(hubQuery({ kind: 'all', unread: false, page: 1 }, true), '?deleted=1')
  assert.equal(hubHref({ kind: 'promotional', unread: false, page: 1 }), '/messages?type=promotional')
  const view = { kind: 'promotional', unread: true, page: 4 }
  assert.deepEqual(hubView(Object.fromEntries(new URLSearchParams(hubQuery(view)))), view)
})

test('filters pick a kind, unread only combines with any of them, and All shows both kinds', () => {
  const list = [inbox('d1'), inbox('d2', READ), inbox('p1', null, 'promotional'), inbox('p2', READ, 'promotional')]
  const ids = (view) => filterMessages(list, view).map((m) => m.id)
  assert.deepEqual(ids({ kind: 'all', unread: false }), ['d1', 'd2', 'p1', 'p2'])
  assert.deepEqual(ids({ kind: 'direct', unread: false }), ['d1', 'd2'])
  assert.deepEqual(ids({ kind: 'promotional', unread: false }), ['p1', 'p2'])
  assert.deepEqual(ids({ kind: 'all', unread: true }), ['d1', 'p1'])
  assert.deepEqual(ids({ kind: 'direct', unread: true }), ['d1'])
  assert.deepEqual(ids({ kind: 'promotional', unread: true }), ['p1'])
  assert.deepEqual(filterMessages(undefined, { kind: 'all', unread: false }), [])
})

test('each filter has its own empty line', () => {
  assert.equal(emptyText({ kind: 'all', unread: false }), 'No messages yet.')
  assert.equal(emptyText({ kind: 'direct', unread: false }), 'No direct messages yet.')
  assert.equal(emptyText({ kind: 'promotional', unread: true }), 'No unread promotional messages.')
  assert.equal(emptyText({ kind: 'all', unread: true }), 'No unread messages.')
})

test('the hub pages 10 at a time, with pagination only past 10, and a page past the end shows the last', () => {
  const list = Array.from({ length: 25 }, (_, i) => i)
  assert.equal(HUB_PAGE_SIZE, 10)
  assert.deepEqual(pageSlice(list.slice(0, 10), 1, 10), { items: list.slice(0, 10), page: 1, pages: 1 })
  assert.equal(pageSlice(list.slice(0, 11), 1, 10).pages, 2)
  assert.deepEqual(pageSlice(list, 3, 10), { items: [20, 21, 22, 23, 24], page: 3, pages: 3 })
  assert.equal(pageSlice(list, 9, 10).page, 3)
  assert.equal(pageSlice(list, 0, 10).page, 1)
  assert.deepEqual(pageSlice([], 2, 10), { items: [], page: 1, pages: 1 })
})

test('page numbers collapse into ellipsis gaps around the current page', () => {
  // 1 … 4 [5] 6 … 20
  assert.deepEqual(visiblePages(5, 20), [1, 4, 5, 6, 20])
  assert.deepEqual(visiblePages(1, 3), [1, 2, 3])
  assert.deepEqual(visiblePages(20, 20), [1, 19, 20])
})

const stays = toStayRefs([
  { id: 'r-past', hotel_id: 'h1', check_in: '2026-10-20', check_out: '2026-10-23', status: 'completed' },
  { id: 'r-next', hotel_id: 'h1', check_in: '2026-11-25', check_out: '2026-11-28', status: 'confirmed' },
  { id: 'r-now', hotel_id: 'h2', check_in: '2026-11-19T00:00:00+00:00', check_out: '2026-11-22T00:00:00+00:00', status: 'confirmed' },
  { id: 'r-off', hotel_id: 'h1', check_in: '2026-11-17', check_out: '2026-11-19', status: 'cancelled' },
])
const TODAY = '2026-11-20'

test('reservation rows become stay refs, dropping ones without an id or dates', () => {
  assert.equal(stays.length, 4)
  assert.deepEqual(stays[2], { id: 'r-now', hotelId: 'h2', checkIn: '2026-11-19', checkOut: '2026-11-22', status: 'confirmed' })
  assert.deepEqual(toStayRefs([{ id: 'x' }, null, { check_in: '2026-01-01', check_out: '2026-01-02' }]), [])
  assert.equal(toStayRefs([{ id: 'x', check_in: '2026-01-01', check_out: '2026-01-02' }])[0].status, 'confirmed')
  assert.deepEqual(toStayRefs(undefined), [])
})

test('a message with a reservation_id is about that stay, at its stage', () => {
  const upcoming = messageStay(inbox('a', null, 'direct', { reservationId: 'r-next' }), stays, TODAY)
  assert.deepEqual(upcoming, { reservationId: 'r-next', stage: 'upcoming', dates: 'Nov 25 - 28, 2026' })
  assert.equal(messageStay(inbox('a', null, 'direct', { reservationId: 'r-now', hotelId: 'h2' }), stays, TODAY).stage, 'in-stay')
  assert.equal(messageStay(inbox('a', null, 'direct', { reservationId: 'r-past' }), stays, TODAY).stage, 'past')
  assert.equal(messageStay(inbox('a', null, 'direct', { reservationId: 'r-off' }), stays, TODAY).stage, 'cancelled')
  assert.equal(messageStay(inbox('a', null, 'direct', { reservationId: 'gone' }), stays, TODAY), null)
})

test('a Direct message without a reservation_id falls back to the nearest stay at that hotel, skipping cancelled ones', () => {
  const afterStay = inbox('a', null, 'direct', { createdAt: '2026-10-24T09:00:00Z' })
  assert.equal(messageStay(afterStay, stays, TODAY).reservationId, 'r-past')
  const beforeNext = inbox('a', null, 'direct', { createdAt: '2026-11-18T09:00:00Z' })
  assert.equal(messageStay(beforeNext, stays, TODAY).reservationId, 'r-next')
  assert.equal(messageStay(inbox('a', null, 'direct', { hotelId: 'h9' }), stays, TODAY), null)
  assert.equal(messageStay(inbox('a'), [], TODAY), null)
})

test('a Promotional message without a reservation_id has no stay', () => {
  assert.equal(messageStay(inbox('p', null, 'promotional'), stays, TODAY), null)
  assert.equal(messageStay(inbox('p', null, 'promotional', { reservationId: 'r-past' }), stays, TODAY).stage, 'past')
})

test('the stay line names the stage and dates, or "Special offer" for a promotion with no stay', () => {
  const stay = (stage) => ({ reservationId: 'r', stage, dates: 'Oct 20 - 23, 2026' })
  assert.equal(stayLine(inbox('a'), stay('past')), 'Past stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(inbox('a'), stay('upcoming')), 'Upcoming stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(inbox('a'), stay('in-stay')), 'Current stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(inbox('p', null, 'promotional'), stay('past')), 'Past stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(inbox('p', null, 'promotional'), null), 'Special offer')
  assert.equal(stayLine(inbox('a'), null), '')
})

test('the detail page says which stay it is about and links to the reservation or the listing', () => {
  const past = { reservationId: 'r-1', stage: 'past', dates: '' }
  assert.equal(regardingLine('Pacific Terrace', past), 'Regarding your previous stay at Pacific Terrace')
  assert.equal(regardingLine('Casa Maré', { ...past, stage: 'upcoming' }), 'Regarding your upcoming stay at Casa Maré')
  assert.equal(regardingLine('Casa Maré', { ...past, stage: 'in-stay' }), 'Regarding your current stay at Casa Maré')
  assert.equal(regardingLine('Casa Maré', null), '')
  assert.deepEqual(messageLink(inbox('a'), past), { href: '/MyBookings/r-1', label: 'View reservation' })
  assert.equal(messageLink(inbox('a'), null), null)
  assert.deepEqual(messageLink(inbox('p', null, 'promotional'), null), { href: '/reserve/h1', label: 'View listing' })
  assert.deepEqual(messageLink(inbox('p', null, 'promotional'), past), { href: '/reserve/h1', label: 'View listing' })
  assert.equal(messageLink(inbox('p', null, 'promotional', { hotelId: '' }), null), null)
})

// Built from local dates so the calendar wording is the same in any time zone
const NOW = new Date(2026, 10, 19, 15, 30)
const before = (ms, now = NOW) => new Date(now.getTime() - ms).toISOString()
const MIN = 60_000
const HR = 60 * MIN

const DAY = 24 * HR

test('times under a minute old, or a little ahead of the clock, are "now"', () => {
  assert.equal(relativeTime(before(0), NOW), 'now')
  assert.equal(relativeTime(before(59_999), NOW), 'now')
  assert.equal(relativeTime(before(-30_000), NOW), 'now')
})

test('ages are compact: minutes, hours, days, weeks, months (mo, so it never reads as minutes), years', () => {
  assert.equal(relativeTime(before(MIN), NOW), '1m')
  assert.equal(relativeTime(before(10 * MIN + 20_000), NOW), '10m')
  assert.equal(relativeTime(before(HR - 1), NOW), '59m')
  assert.equal(relativeTime(before(HR), NOW), '1h')
  assert.equal(relativeTime(before(3 * HR + 59 * MIN), NOW), '3h')
  assert.equal(relativeTime(before(DAY), NOW), '1d')
  assert.equal(relativeTime(before(5 * DAY), NOW), '5d')
  assert.equal(relativeTime(before(7 * DAY), NOW), '1w')
  assert.equal(relativeTime(before(20 * DAY), NOW), '2w')
  assert.equal(relativeTime(before(30 * DAY), NOW), '1mo')
  assert.equal(relativeTime(before(185 * DAY), NOW), '6mo')
  assert.equal(relativeTime(before(365 * DAY), NOW), '1y')
  assert.equal(relativeTime(before(800 * DAY), NOW), '2y')
})

test('an invalid date gives no time label', () => {
  assert.equal(relativeTime('not a date', NOW), '')
  assert.equal(relativeTime('', NOW), '')
  assert.equal(relativeTime(undefined, NOW), '')
  assert.equal(relativeTime(null, NOW), '')
  assert.equal(relativeTime(before(HR), new Date('nope')), '')
  assert.equal(relativeTime(before(HR), undefined), '')
})
