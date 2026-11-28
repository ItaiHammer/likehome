// Messages frontend: inbox rows, mail badge, header menu, hub filters and paging, previews, times, stay lines
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
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

const inbox = (id, readAt = null, extra = {}) => ({
  id,
  hotelId: 'h1',
  hotelName: 'Casa del Sol',
  subject: `Subject ${id}`,
  body: 'Hello',
  createdAt: '2026-11-18T09:00:00Z',
  readAt,
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

test('columns the table does not have are ignored', () => {
  const m = toInboxMessage(row({ kind: 'promotional', reservation_id: 'r1', hidden_at: '2026-11-19T10:00:00Z' }))
  assert.deepEqual(Object.keys(m).sort(), ['body', 'createdAt', 'hotelId', 'hotelName', 'id', 'readAt', 'subject'])
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
  const count = (unread) => mailBadge({ unread }).count
  assert.equal(count(0), '')
  assert.equal(count(-3), '')
  assert.equal(count(Number.NaN), '')
  assert.equal(count(1), '1')
  assert.equal(count(9), '9')
  assert.equal(count(10), '9+')
  assert.equal(count(250), '9+')
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

test('the header menu counts unread over the whole inbox and carries the newest five', () => {
  const long = 'word '.repeat(60)
  const list = Array.from({ length: 8 }, (_, i) => ({ ...inbox(`m${i}`, i === 2 || i === 6 ? null : READ), body: long }))
  const summary = bellSummary(list)
  // one unread is past the fifth, so the count can't come from the five alone
  assert.equal(summary.unread, 2)
  assert.deepEqual(summary.latest.map((m) => m.id), ['m0', 'm1', 'm2', 'm3', 'm4'])
  assert.deepEqual(summary.latest[0], { ...list[0], body: preview(long) })
  assert.equal(list[0].body, long)
})

test('the header menu keeps inbox order (newest first)', () => {
  const list = [inbox('new'), inbox('mid', READ), inbox('old')]
  assert.deepEqual(bellSummary(list).latest.map((m) => m.id), ['new', 'mid', 'old'])
})

test('the header menu takes another size and copes with an empty or missing inbox', () => {
  const list = [inbox('a'), inbox('b'), inbox('c', READ)]
  assert.equal(bellSummary(list, 1).latest.length, 1)
  assert.equal(bellSummary(list, 0).latest.length, 0)
  assert.equal(bellSummary(list, 0).unread, 2)
  assert.equal(bellSummary(list, Number.NaN).latest.length, 3)
  const empty = { unread: 0, latest: [] }
  assert.deepEqual(bellSummary([]), empty)
  assert.deepEqual(bellSummary(undefined), empty)
})

test('the mail badge shows the unread count, capped at 9+', () => {
  assert.deepEqual(mailBadge({ unread: 3 }), { count: '3', label: 'Messages, 3 unread' })
  assert.deepEqual(mailBadge({ unread: 9 }), { count: '9', label: 'Messages, 9 unread' })
  assert.deepEqual(mailBadge({ unread: 12 }), { count: '9+', label: 'Messages, 12 unread' })
  assert.deepEqual(mailBadge({ unread: 0 }), { count: '', label: 'Messages' })
  assert.deepEqual(mailBadge(undefined), { count: '', label: 'Messages' })
})

test('the hub view reads unread and page from the search params, ignoring old type links', () => {
  assert.deepEqual(hubView({}), { unread: false, page: 1 })
  assert.deepEqual(hubView({ unread: '1', page: '3' }), { unread: true, page: 3 })
  assert.deepEqual(hubView({ type: 'promotional', unread: '1' }), { unread: true, page: 1 })
  assert.deepEqual(hubView({ unread: 'yes', page: '-2' }), { unread: false, page: 1 })
  assert.deepEqual(hubView({ page: ['2'] }), { unread: false, page: 1 })
  assert.deepEqual(hubView(undefined), { unread: false, page: 1 })
})

test('the hub query leaves out defaults, and round-trips through hubView', () => {
  assert.equal(hubQuery({ unread: false, page: 1 }), '')
  assert.equal(hubQuery({ unread: true, page: 2 }), '?unread=1&page=2')
  assert.equal(hubHref({ unread: false, page: 3 }), '/messages?page=3')
  assert.equal(hubHref({ unread: false, page: 1 }), '/messages')
  const view = { unread: true, page: 4 }
  assert.deepEqual(hubView(Object.fromEntries(new URLSearchParams(hubQuery(view)))), view)
})

test('unread only keeps the unread messages in inbox order', () => {
  const list = [inbox('a'), inbox('b', READ), inbox('c'), inbox('d', READ)]
  assert.deepEqual(filterMessages(list, { unread: false }).map((m) => m.id), ['a', 'b', 'c', 'd'])
  assert.deepEqual(filterMessages(list, { unread: true }).map((m) => m.id), ['a', 'c'])
  assert.deepEqual(filterMessages(undefined, { unread: false }), [])
})

test('each view has its own empty line', () => {
  assert.equal(emptyText({ unread: false }), 'No messages yet.')
  assert.equal(emptyText({ unread: true }), 'No unread messages.')
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

test('a message is about the nearest stay at its hotel to when it was sent, at that stay\'s stage', () => {
  const afterStay = inbox('a', null, { createdAt: '2026-10-24T09:00:00Z' })
  assert.deepEqual(messageStay(afterStay, stays, TODAY), { reservationId: 'r-past', stage: 'past', dates: 'Oct 20 - 23, 2026' })
  const beforeNext = inbox('a', null, { createdAt: '2026-11-18T09:00:00Z' })
  assert.deepEqual(messageStay(beforeNext, stays, TODAY), { reservationId: 'r-next', stage: 'upcoming', dates: 'Nov 25 - 28, 2026' })
  const during = inbox('a', null, { hotelId: 'h2', createdAt: '2026-11-20T09:00:00Z' })
  assert.equal(messageStay(during, stays, TODAY).stage, 'in-stay')
})

test('cancelled stays and other hotels\' stays are never matched', () => {
  // r-off (cancelled) contains the send date, so r-next wins
  assert.equal(messageStay(inbox('a', null, { createdAt: '2026-11-18T09:00:00Z' }), stays, TODAY).reservationId, 'r-next')
  assert.equal(messageStay(inbox('a', null, { hotelId: 'h9' }), stays, TODAY), null)
  const onlyCancelled = toStayRefs([{ id: 'x', hotel_id: 'h1', check_in: '2026-11-17', check_out: '2026-11-19', status: 'cancelled' }])
  assert.equal(messageStay(inbox('a'), onlyCancelled, TODAY), null)
  assert.equal(messageStay(inbox('a'), [], TODAY), null)
})

test('the stay line names the stage and dates, and is empty with no stay', () => {
  const stay = (stage) => ({ reservationId: 'r', stage, dates: 'Oct 20 - 23, 2026' })
  assert.equal(stayLine(stay('past')), 'Past stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(stay('upcoming')), 'Upcoming stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(stay('in-stay')), 'Current stay · Oct 20 - 23, 2026')
  assert.equal(stayLine(null), '')
})

test('the detail page says which stay it is about and links to the reservation, else the listing', () => {
  const past = { reservationId: 'r-1', stage: 'past', dates: '' }
  assert.equal(regardingLine('Pacific Terrace', past), 'Regarding your previous stay at Pacific Terrace')
  assert.equal(regardingLine('Casa Maré', { ...past, stage: 'upcoming' }), 'Regarding your upcoming stay at Casa Maré')
  assert.equal(regardingLine('Casa Maré', { ...past, stage: 'in-stay' }), 'Regarding your current stay at Casa Maré')
  assert.equal(regardingLine('Casa Maré', null), '')
  assert.deepEqual(messageLink(inbox('a'), past), { href: '/MyBookings/r-1', label: 'View reservation' })
  assert.deepEqual(messageLink(inbox('a'), null), { href: '/reserve/h1', label: 'View listing' })
  assert.equal(messageLink(inbox('a', null, { hotelId: '' }), null), null)
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
