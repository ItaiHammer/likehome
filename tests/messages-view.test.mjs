// Messages frontend: inbox rows, bell badge, previews, times, owner's sent list, recipient picker, composer checks
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BODY_MAX,
  SUBJECT_MAX,
  badgeLabel,
  bellSummary,
  composeProblem,
  filterRecipients,
  groupSent,
  markRead,
  preview,
  relativeTime,
  toInboxMessage,
  toInboxMessages,
  toRecipients,
  unreadCount,
} from '../lib/messages.ts'

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

const inbox = (id, readAt = null) => ({
  id,
  hotelId: 'h1',
  hotelName: 'Casa del Sol',
  subject: `Subject ${id}`,
  body: 'Hello',
  createdAt: '2026-11-18T09:00:00Z',
  readAt,
})

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

test('the bell counts unread across the whole inbox but carries only the newest five, with short bodies', () => {
  const long = 'word '.repeat(60)
  const read = '2026-11-18T10:00:00Z'
  const list = Array.from({ length: 8 }, (_, i) => ({ ...inbox(`m${i}`, i < 5 ? read : null), body: long }))
  const { unread, latest } = bellSummary(list)
  // every unread message is past the fifth, so the count can't come from the five alone
  assert.equal(unread, 3)
  assert.deepEqual(latest.map((m) => m.id), ['m0', 'm1', 'm2', 'm3', 'm4'])
  assert.deepEqual(latest[0], { ...list[0], body: preview(long) })
  assert.equal(latest.every((m) => m.body.length <= 90 && m.body.endsWith('…')), true)
  assert.equal(list[0].body, long)
})

test('the bell summary takes another limit and copes with an empty or missing inbox', () => {
  const list = [inbox('a'), inbox('b'), inbox('c', '2026-11-18T10:00:00Z')]
  assert.deepEqual(bellSummary(list, 1), { unread: 2, latest: [list[0]] })
  assert.deepEqual(bellSummary(list, 0), { unread: 2, latest: [] })
  assert.equal(bellSummary(list, 2.7).latest.length, 2)
  assert.equal(bellSummary(Array.from({ length: 7 }, (_, i) => inbox(`x${i}`)), Number.NaN).latest.length, 5)
  assert.equal(bellSummary(list, -1).latest.length, 3)
  assert.deepEqual(bellSummary([]), { unread: 0, latest: [] })
  assert.deepEqual(bellSummary(undefined), { unread: 0, latest: [] })
})

// Built from local dates so the calendar wording is the same in any time zone
const NOW = new Date(2026, 10, 19, 15, 30)
const before = (ms, now = NOW) => new Date(now.getTime() - ms).toISOString()
const local = (...parts) => new Date(...parts).toISOString()
const MIN = 60_000
const HR = 60 * MIN

test('times under a minute old, or a little ahead of the clock, are "Just now"', () => {
  assert.equal(relativeTime(before(0), NOW), 'Just now')
  assert.equal(relativeTime(before(59_999), NOW), 'Just now')
  assert.equal(relativeTime(before(-30_000), NOW), 'Just now')
})

test('times under an hour old are in minutes', () => {
  assert.equal(relativeTime(before(MIN), NOW), '1 min ago')
  assert.equal(relativeTime(before(5 * MIN + 20_000), NOW), '5 min ago')
  assert.equal(relativeTime(before(HR - 1), NOW), '59 min ago')
})

test('times under a day old are in hours, even across midnight', () => {
  assert.equal(relativeTime(before(HR), NOW), '1 hr ago')
  assert.equal(relativeTime(before(3 * HR + 59 * MIN), NOW), '3 hr ago')
  assert.equal(relativeTime(local(2026, 10, 18, 16, 30), NOW), '23 hr ago')
  const justAfterMidnight = new Date(2026, 10, 19, 1, 0)
  assert.equal(relativeTime(local(2026, 10, 18, 23, 0), justAfterMidnight), '2 hr ago')
})

test('a day or more old on the previous calendar day is "Yesterday"', () => {
  assert.equal(relativeTime(local(2026, 10, 18, 9, 0), NOW), 'Yesterday')
  assert.equal(relativeTime(local(2026, 10, 18, 0, 5), NOW), 'Yesterday')
  const newYearsNight = new Date(2027, 0, 1, 23, 0)
  assert.equal(relativeTime(local(2026, 11, 31, 8, 0), newYearsNight), 'Yesterday')
})

test('older times show the date, with the year only when it is not this year', () => {
  // 26 hours ago, but two calendar days back
  assert.equal(relativeTime(local(2026, 10, 17, 23, 0), new Date(2026, 10, 19, 1, 0)), 'Nov 17')
  assert.equal(relativeTime(local(2026, 10, 12, 8, 0), NOW), 'Nov 12')
  assert.equal(relativeTime(local(2026, 1, 3, 12, 0), NOW), 'Feb 3')
  assert.equal(relativeTime(local(2025, 10, 12, 12, 0), NOW), 'Nov 12, 2025')
  assert.equal(relativeTime(local(2026, 11, 30, 12, 0), new Date(2027, 0, 2, 12, 0)), 'Dec 30, 2026')
})

test('an invalid date gives no time label', () => {
  assert.equal(relativeTime('not a date', NOW), '')
  assert.equal(relativeTime('', NOW), '')
  assert.equal(relativeTime(undefined, NOW), '')
  assert.equal(relativeTime(null, NOW), '')
  assert.equal(relativeTime(before(HR), new Date('nope')), '')
  assert.equal(relativeTime(before(HR), undefined), '')
})

test('marking a message read changes only that unread message and returns a new list', () => {
  const list = [inbox('a'), inbox('b', '2026-11-18T10:00:00Z'), inbox('c')]
  const next = markRead(list, 'a', '2026-11-19T12:00:00Z')
  assert.notEqual(next, list)
  assert.equal(next[0].readAt, '2026-11-19T12:00:00Z')
  assert.equal(list[0].readAt, null)
  assert.equal(next[1], list[1])
  assert.equal(next[2], list[2])
})

test('marking an already-read message keeps its first read time', () => {
  const list = [inbox('a'), inbox('b', '2026-11-18T10:00:00Z')]
  const next = markRead(list, 'b', '2026-11-19T12:00:00Z')
  assert.notEqual(next, list)
  assert.equal(next[1], list[1])
  assert.equal(next[1].readAt, '2026-11-18T10:00:00Z')
  assert.deepEqual(markRead(list, 'missing', '2026-11-19T12:00:00Z'), list)
  assert.deepEqual(markRead(list, 'a', ''), list)
  assert.deepEqual(markRead(undefined, 'a', '2026-11-19T12:00:00Z'), [])
})

const sentRow = (id, created_at, subject, body, read_at = null, hotel_id = 'h1') => ({
  id,
  hotel_id,
  recipient_id: `guest-${id}`,
  subject,
  body,
  read_at,
  created_at,
})

test('one send to several guests is one sent message with recipient and read counts', () => {
  const pool = ['2026-11-10T09:00:00.123456+00:00', 'Pool closed', 'The pool is closed Tuesday.']
  const late = ['2026-11-15T18:30:00.5+00:00', 'Late checkout', 'Checkout is noon this weekend.']
  const rows = [
    sentRow('p2', ...pool, '2026-11-10T12:00:00Z'),
    sentRow('l9', ...late, '2026-11-15T19:00:00Z'),
    sentRow('p3', ...pool),
    sentRow('l4', ...late, '2026-11-16T08:00:00Z'),
    sentRow('p1', ...pool),
  ]
  assert.deepEqual(groupSent(rows), [
    { key: 'l4', subject: 'Late checkout', body: 'Checkout is noon this weekend.', sentAt: late[0], recipients: 2, read: 2 },
    { key: 'p1', subject: 'Pool closed', body: 'The pool is closed Tuesday.', sentAt: pool[0], recipients: 3, read: 1 },
  ])
})

test('a sent message keeps the same key whatever order its rows arrive in', () => {
  const at = '2026-11-10T09:00:00Z'
  const rows = [sentRow('b', at, 'Hi', 'Body'), sentRow('a', at, 'Hi', 'Body'), sentRow('c', at, 'Hi', 'Body')]
  assert.equal(groupSent(rows)[0].key, 'a')
  assert.equal(groupSent([...rows].reverse())[0].key, 'a')
})

test('the same words sent at another time, or with another body, are separate messages', () => {
  const rows = [
    sentRow('x1', '2026-11-01T09:00:00Z', 'Reminder', 'Same body'),
    sentRow('x2', '2026-11-03T09:00:00Z', 'Reminder', 'Same body'),
    sentRow('x3', '2026-11-03T09:00:00Z', 'Reminder', 'Other body'),
  ]
  const sent = groupSent(rows)
  assert.equal(sent.length, 3)
  assert.deepEqual(sent.map((s) => s.key), ['x2', 'x3', 'x1'])
  assert.equal(sent.every((s) => s.recipients === 1 && s.read === 0), true)
})

test('sent rows that are not usable are skipped, and bad dates sort last', () => {
  const rows = [
    sentRow('bad-date', 'whenever', 'Odd', 'Body'),
    null,
    'junk',
    sentRow('', '2026-11-01T09:00:00Z', 'No id', 'Body'),
    sentRow('no-subject', '2026-11-01T09:00:00Z', '', 'Body'),
    sentRow('ok', '2026-11-01T09:00:00Z', 'Fine', 'Body'),
  ]
  assert.deepEqual(groupSent(rows).map((s) => s.key), ['ok', 'bad-date'])
  for (const odd of [null, undefined, {}, 'rows']) assert.deepEqual(groupSent(odd), [])
})

const guest = (account_id, full_name, email, extra = {}) => ({
  account_id,
  email,
  full_name,
  last_check_in: '2026-10-01T00:00:00+00:00',
  last_status: 'confirmed',
  ...extra,
})

test('recipient rows become recipients, named by email when there is no name', () => {
  const list = toRecipients([
    guest('g1', 'Zoe Park', 'zoe@example.com'),
    guest('g2', null, 'amir@example.com', { last_check_in: null, last_status: null }),
    guest('g3', '   ', 'blank@example.com'),
  ])
  assert.deepEqual(list, [
    { accountId: 'g2', email: 'amir@example.com', name: 'amir@example.com', lastCheckIn: null, lastStatus: null },
    { accountId: 'g3', email: 'blank@example.com', name: 'blank@example.com', lastCheckIn: '2026-10-01T00:00:00+00:00', lastStatus: 'confirmed' },
    { accountId: 'g1', email: 'zoe@example.com', name: 'Zoe Park', lastCheckIn: '2026-10-01T00:00:00+00:00', lastStatus: 'confirmed' },
  ])
})

test('recipients without an account id are dropped, repeats are kept once, and the list is by name', () => {
  const list = toRecipients([
    guest('g1', 'bea Lin', 'bea@example.com'),
    guest(null, 'Nobody', 'nobody@example.com'),
    'junk',
    guest('g2', 'Ana Ruiz', 'ana@example.com'),
    guest('g1', 'Bea Again', 'bea2@example.com'),
    guest('g4', null, null),
  ])
  assert.deepEqual(list.map((r) => r.accountId), ['g2', 'g1', 'g4'])
  assert.equal(list[1].name, 'bea Lin')
  assert.equal(list[2].name, 'Guest')
  assert.equal(list[2].email, '')
  for (const odd of [null, undefined, {}, 'rows']) assert.deepEqual(toRecipients(odd), [])
})

const picker = toRecipients([
  guest('g1', 'Ana Ruiz', 'ana@example.com'),
  guest('g2', 'Ben Okafor', 'ben.o@mail.test'),
  guest('g3', 'Chloe Anand', 'chloe@example.com'),
])

test('the recipient search matches names or emails, ignoring case', () => {
  assert.deepEqual(filterRecipients(picker, 'ANA').map((r) => r.accountId), ['g1', 'g3'])
  assert.deepEqual(filterRecipients(picker, 'mail.test').map((r) => r.accountId), ['g2'])
  assert.deepEqual(filterRecipients(picker, '  okafor ').map((r) => r.accountId), ['g2'])
  assert.deepEqual(filterRecipients(picker, 'zzz'), [])
})

test('a blank recipient search shows everyone', () => {
  assert.deepEqual(filterRecipients(picker, ''), picker)
  assert.deepEqual(filterRecipients(picker, '   '), picker)
  assert.deepEqual(filterRecipients(picker, undefined), picker)
  assert.deepEqual(filterRecipients([], 'ana'), [])
  assert.deepEqual(filterRecipients(undefined, 'ana'), [])
})

const draft = (overrides = {}) => ({
  hotelId: 'h1',
  recipientIds: ['g1', 'g2'],
  subject: 'Pool closed Tuesday',
  body: 'The pool will be closed for cleaning.',
  ...overrides,
})

test('a complete message has no problem', () => {
  assert.equal(composeProblem(draft()), null)
  assert.equal(composeProblem(draft({ subject: 's'.repeat(SUBJECT_MAX), body: 'b'.repeat(BODY_MAX) })), null)
})

test('the limits are 120 characters for a subject and 2000 for a message', () => {
  assert.equal(SUBJECT_MAX, 120)
  assert.equal(BODY_MAX, 2000)
})

test('a message needs a hotel to come from', () => {
  for (const hotelId of ['', '   ', undefined, null]) {
    const problem = composeProblem(draft({ hotelId }))
    assert.equal(problem.field, 'hotel')
    assert.match(problem.message, /hotel/)
  }
})

test('a message needs at least one guest to go to', () => {
  for (const recipientIds of [[], ['', '  '], undefined, null, 'g1']) {
    const problem = composeProblem(draft({ recipientIds }))
    assert.equal(problem.field, 'recipients')
    assert.match(problem.message, /guest/)
  }
  assert.equal(composeProblem(draft({ recipientIds: ['', 'g1'] })), null)
})

test('a message needs a subject of at most 120 characters, not counting outer spaces', () => {
  for (const subject of ['', '   \n ', undefined]) {
    assert.deepEqual(composeProblem(draft({ subject })), { field: 'subject', message: 'Add a subject.' })
  }
  const long = composeProblem(draft({ subject: 's'.repeat(SUBJECT_MAX + 1) }))
  assert.equal(long.field, 'subject')
  assert.match(long.message, /120 characters/)
  assert.equal(composeProblem(draft({ subject: `  ${'s'.repeat(SUBJECT_MAX)}  ` })), null)
})

test('a message needs a body of at most 2000 characters, not counting outer spaces', () => {
  for (const body of ['', ' \n\t ', undefined]) {
    const problem = composeProblem(draft({ body }))
    assert.equal(problem.field, 'body')
    assert.equal(problem.message, 'Write a message to send.')
  }
  const long = composeProblem(draft({ body: 'b'.repeat(BODY_MAX + 1) }))
  assert.equal(long.field, 'body')
  assert.match(long.message, /2000 characters/)
  assert.equal(composeProblem(draft({ body: `\n${'b'.repeat(BODY_MAX)}\n\n` })), null)
})

test('problems are reported in form order, hotel first', () => {
  assert.equal(composeProblem({ hotelId: '', recipientIds: [], subject: '', body: '' }).field, 'hotel')
  assert.equal(composeProblem(draft({ recipientIds: [], subject: '' })).field, 'recipients')
  assert.equal(composeProblem(draft({ subject: '', body: '' })).field, 'subject')
  assert.equal(composeProblem(undefined).field, 'hotel')
})
