// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// Messages are one-way: a hotel owner sends to guests with a reservation there. Rows come from
// the /api/messages JSON, so every shape is checked.
import { bookingStage, formatStayDates } from './bookings.ts'
import type { BookingStage } from './hotel-customers.ts'
import { PAGE_ROUTES } from '../constants/routes.ts'
import { pageParam } from './pagination.ts'

export type InboxMessage = {
  id: string
  hotelId: string
  hotelName: string
  subject: string
  body: string
  createdAt: string
  readAt: string | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const filled = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)

const asText = (value: unknown): string => (typeof value === 'string' ? value : '')

// The hotels(name) join is an object, but some Supabase clients hand back a one-item array
function joinedHotelName(hotels: unknown): string {
  const hotel = Array.isArray(hotels) ? hotels[0] : hotels
  return (isRecord(hotel) && filled(hotel.name)?.trim()) || 'A hotel'
}

export function toInboxMessage(row: unknown): InboxMessage | null {
  if (!isRecord(row)) return null
  const id = filled(row.id)
  const subject = filled(row.subject)
  const createdAt = filled(row.created_at)
  if (!id || !subject || !createdAt) return null
  return {
    id,
    hotelId: asText(row.hotel_id),
    hotelName: joinedHotelName(row.hotels),
    subject,
    body: asText(row.body),
    createdAt,
    readAt: filled(row.read_at),
  }
}

export function toInboxMessages(rows: unknown): InboxMessage[] {
  if (!Array.isArray(rows)) return []
  return rows.map(toInboxMessage).filter((m): m is InboxMessage => m !== null)
}

const isUnread = (message: InboxMessage) => !message?.readAt

export function unreadCount(messages: InboxMessage[]): number {
  return Array.isArray(messages) ? messages.filter(isUnread).length : 0
}

/** One line for a list row. The result, ellipsis included, is at most `max` characters. */
export function preview(body: string, max = 90): string {
  if (typeof body !== 'string') return ''
  const text = body.replace(/\s+/g, ' ').trim()
  const limit = Number.isFinite(max) && max >= 1 ? Math.floor(max) : 90
  if (text.length <= limit) return text

  let room = text.slice(0, limit - 1)
  if (/[\uD800-\uDBFF]$/.test(room)) room = room.slice(0, -1)
  const endsOnWord = text[room.length] === ' '
  const lastSpace = room.lastIndexOf(' ')
  const cut = (endsOnWord || lastSpace <= 0 ? room : room.slice(0, lastSpace)).replace(/[\s,;:.!?\-–—]+$/, '')
  return `${cut || room.trimEnd()}…`
}

export type BellSummary = { unread: number; latest: InboxMessage[] }

const BELL_LATEST = 5

/**
 * What the header mail menu shows: the unread count over the whole inbox, and its first `size`
 * messages (the inbox is newest first) with bodies cut down by preview().
 */
export function bellSummary(messages: InboxMessage[], size = BELL_LATEST): BellSummary {
  const list = Array.isArray(messages) ? messages : []
  const n = Number.isFinite(size) && size >= 0 ? Math.floor(size) : BELL_LATEST
  return {
    unread: unreadCount(list),
    latest: list.slice(0, n).map((m) => ({ ...m, body: preview(m.body) })),
  }
}

/** The mail icon's mark: the unread count, 9+ past nine */
export function mailBadge(summary: Pick<BellSummary, 'unread'>): { count: string; label: string } {
  const n = Math.floor(summary?.unread)
  if (!(n > 0)) return { count: '', label: 'Messages' }
  return { count: n > 9 ? '9+' : String(n), label: `Messages, ${n} unread` }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

// Compact age: now, 10m, 3h, 5d, 2w, 6mo, 1y. A time slightly ahead of `now` (clock skew) is "now".
export function relativeTime(iso: string, now: Date): string {
  if (typeof iso !== 'string' || !iso.trim() || !(now instanceof Date)) return ''
  const diff = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < MINUTE) return 'now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w`
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo`
  return `${Math.floor(diff / YEAR)}y`
}

export type HubView = { unread: boolean; page: number }

export const HUB_PAGE_SIZE = 10

type Params = Record<string, string | string[] | undefined>

/** The hub's filter and page from its search params (?unread=1&page=2) */
export function hubView(params: Params): HubView {
  return { unread: params?.unread === '1', page: pageParam(params?.page) }
}

export const hubHref = (view: HubView) => `${PAGE_ROUTES.MESSAGES}${hubQuery(view)}`

/** Search string for a hub view, "" for the default one */
export function hubQuery(view: HubView): string {
  const params = new URLSearchParams()
  if (view.unread) params.set('unread', '1')
  if (view.page > 1) params.set('page', String(view.page))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function filterMessages(messages: InboxMessage[], view: Pick<HubView, 'unread'>): InboxMessage[] {
  if (!Array.isArray(messages)) return []
  return view.unread ? messages.filter(isUnread) : messages
}

export function emptyText(view: Pick<HubView, 'unread'>): string {
  return view.unread ? 'No unread messages.' : 'No messages yet.'
}

/** A reservation the traveler can read, as the stay line needs it */
export type StayRef = { id: string; hotelId: string; checkIn: string; checkOut: string; status: string }

export type MessageStay = { reservationId: string; stage: BookingStage; dates: string }

export function toStayRefs(rows: unknown): StayRef[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!isRecord(row)) return []
    const id = filled(row.id)
    const checkIn = filled(row.check_in)?.slice(0, 10)
    const checkOut = filled(row.check_out)?.slice(0, 10)
    if (!id || !checkIn || !checkOut) return []
    return [{ id, hotelId: asText(row.hotel_id), checkIn, checkOut, status: filled(row.status) ?? 'confirmed' }]
  })
}

// How far a date is from a stay, 0 when it falls inside it
function distance(day: string, stay: StayRef): number {
  if (day >= stay.checkIn && day <= stay.checkOut) return 0
  const edge = day < stay.checkIn ? stay.checkIn : stay.checkOut
  return Math.abs(Date.parse(edge) - Date.parse(day))
}

/** The stay a message is about: the traveler's non-cancelled stay at that hotel nearest to when it was sent */
export function messageStay(message: InboxMessage, stays: StayRef[], today: string): MessageStay | null {
  if (!message || !Array.isArray(stays)) return null
  const sent = message.createdAt.slice(0, 10)
  const stay = stays
    .filter((s) => s.hotelId === message.hotelId && s.status !== 'cancelled')
    .sort((a, b) => distance(sent, a) - distance(sent, b))[0]
  return stay ? { reservationId: stay.id, stage: bookingStage(stay, today), dates: formatStayDates(stay.checkIn, stay.checkOut) } : null
}

const STAGE_LINE: Record<BookingStage, string> = {
  upcoming: 'Upcoming stay',
  'in-stay': 'Current stay',
  past: 'Past stay',
  cancelled: 'Cancelled stay',
}

const STAGE_WORD: Record<BookingStage, string> = {
  upcoming: 'upcoming',
  'in-stay': 'current',
  past: 'previous',
  cancelled: 'cancelled',
}

/** The hub row's last line: "Past stay · Oct 20 - 23, 2026", or "" with no stay */
export function stayLine(stay: MessageStay | null): string {
  return stay ? `${STAGE_LINE[stay.stage]} · ${stay.dates}` : ''
}

/** "Regarding your previous stay at Pacific Terrace", or "" with no stay */
export function regardingLine(hotelName: string, stay: MessageStay | null): string {
  return stay ? `Regarding your ${STAGE_WORD[stay.stage]} stay at ${hotelName}` : ''
}

/** The reservation the message is about, else the hotel's page */
export function messageLink(message: InboxMessage, stay: MessageStay | null): { href: string; label: string } | null {
  if (stay) return { href: `${PAGE_ROUTES.MY_BOOKINGS}/${encodeURIComponent(stay.reservationId)}`, label: 'View reservation' }
  return message?.hotelId ? { href: `/reserve/${encodeURIComponent(message.hotelId)}`, label: 'View listing' } : null
}
