// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// Messages are one-way: a hotel owner sends to guests with a reservation there. Rows come from
// the /api/messages JSON, so every shape is checked.
// kind, reservation_id and hidden_at may not exist on the table yet: a missing kind reads as
// 'direct', a missing reservation_id as none, and a row with hidden_at set is left out everywhere.
import { bookingStage, formatStayDates } from './bookings.ts'
import type { BookingStage } from './hotel-customers.ts'
import { PAGE_ROUTES } from '../constants/routes.ts'
import { pageParam } from './pagination.ts'

export type MessageKind = 'direct' | 'promotional'

export const KIND_LABEL: Record<MessageKind, string> = { direct: 'Direct', promotional: 'Promotional' }

export type InboxMessage = {
  id: string
  hotelId: string
  hotelName: string
  subject: string
  body: string
  createdAt: string
  readAt: string | null
  kind: MessageKind
  reservationId: string | null
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
  if (!id || !subject || !createdAt || filled(row.hidden_at)) return null
  return {
    id,
    hotelId: asText(row.hotel_id),
    hotelName: joinedHotelName(row.hotels),
    subject,
    body: asText(row.body),
    createdAt,
    readAt: filled(row.read_at),
    kind: row.kind === 'promotional' ? 'promotional' : 'direct',
    reservationId: filled(row.reservation_id),
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

export function badgeLabel(count: number): string {
  const n = Math.floor(count)
  if (!(n > 0)) return ''
  return n > 9 ? '9+' : String(n)
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

export type BellSummary = {
  unreadDirect: number
  unreadPromotional: number
  direct: InboxMessage[]
  promotional: InboxMessage[]
}

const BELL_PER_KIND = 3

/**
 * What the header mail menu shows: unread counts per kind over the whole inbox, and the first
 * `perKind` messages of each kind (the inbox is newest first) with bodies cut down by preview().
 */
export function bellSummary(messages: InboxMessage[], perKind = BELL_PER_KIND): BellSummary {
  const list = Array.isArray(messages) ? messages : []
  const n = Number.isFinite(perKind) && perKind >= 0 ? Math.floor(perKind) : BELL_PER_KIND
  const ofKind = (kind: MessageKind) => list.filter((m) => m.kind === kind)
  const short = (kind: MessageKind) => ofKind(kind).slice(0, n).map((m) => ({ ...m, body: preview(m.body) }))
  return {
    unreadDirect: unreadCount(ofKind('direct')),
    unreadPromotional: unreadCount(ofKind('promotional')),
    direct: short('direct'),
    promotional: short('promotional'),
  }
}

/** The mail icon's mark: a number for unread Direct (9+ past nine), else a dot for unread Promotional */
export function mailBadge(summary: Pick<BellSummary, 'unreadDirect' | 'unreadPromotional'>): { count: string; dot: boolean; label: string } {
  const count = badgeLabel(summary?.unreadDirect)
  const dot = !count && summary?.unreadPromotional > 0
  const label = count ? `Messages, ${Math.floor(summary.unreadDirect)} unread` : dot ? 'Messages, new offers' : 'Messages'
  return { count, dot, label }
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

export type KindFilter = 'all' | MessageKind
export type HubView = { kind: KindFilter; unread: boolean; page: number }

export const HUB_PAGE_SIZE = 10

type Params = Record<string, string | string[] | undefined>

/** The hub's filters and page from its search params (?type=direct&unread=1&page=2) */
export function hubView(params: Params): HubView {
  const type = params?.type
  return {
    kind: type === 'direct' || type === 'promotional' ? type : 'all',
    unread: params?.unread === '1',
    page: pageParam(params?.page),
  }
}

export const hubHref = (view: HubView, deleted = false) => `${PAGE_ROUTES.MESSAGES}${hubQuery(view, deleted)}`

/** Search string for a hub view, "" for the default one. `deleted` asks the hub to confirm a delete. */
export function hubQuery(view: HubView, deleted = false): string {
  const params = new URLSearchParams()
  if (view.kind !== 'all') params.set('type', view.kind)
  if (view.unread) params.set('unread', '1')
  if (view.page > 1) params.set('page', String(view.page))
  if (deleted) params.set('deleted', '1')
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function filterMessages(messages: InboxMessage[], view: Pick<HubView, 'kind' | 'unread'>): InboxMessage[] {
  if (!Array.isArray(messages)) return []
  return messages.filter((m) => (view.kind === 'all' || m.kind === view.kind) && (!view.unread || isUnread(m)))
}

export function emptyText(view: Pick<HubView, 'kind' | 'unread'>): string {
  const kind = view.kind === 'all' ? '' : `${view.kind} `
  if (view.unread) return `No unread ${kind}messages.`
  return kind ? `No ${kind}messages yet.` : 'No messages yet.'
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

/**
 * The stay a message is about: its reservation_id when there is one. A Direct message without one
 * (rows from before that column) falls back to the traveler's stay at that hotel nearest to when it was sent.
 */
export function messageStay(message: InboxMessage, stays: StayRef[], today: string): MessageStay | null {
  if (!message || !Array.isArray(stays)) return null
  let stay: StayRef | undefined
  if (message.reservationId) stay = stays.find((s) => s.id === message.reservationId)
  else if (message.kind === 'direct') {
    const sent = message.createdAt.slice(0, 10)
    stay = stays
      .filter((s) => s.hotelId === message.hotelId && s.status !== 'cancelled')
      .sort((a, b) => distance(sent, a) - distance(sent, b))[0]
  }
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

/** The hub row's last line: "Past stay · Oct 20 - 23, 2026", or "Special offer" for a promotion with no stay */
export function stayLine(message: InboxMessage, stay: MessageStay | null): string {
  if (stay) return `${STAGE_LINE[stay.stage]} · ${stay.dates}`
  return message?.kind === 'promotional' ? 'Special offer' : ''
}

/** "Regarding your previous stay at Pacific Terrace", or "" with no stay */
export function regardingLine(hotelName: string, stay: MessageStay | null): string {
  return stay ? `Regarding your ${STAGE_WORD[stay.stage]} stay at ${hotelName}` : ''
}

/** Direct: the reservation it's about. Promotional: the hotel's page. */
export function messageLink(message: InboxMessage, stay: MessageStay | null): { href: string; label: string } | null {
  if (message?.kind === 'promotional') {
    return message.hotelId ? { href: `/reserve/${encodeURIComponent(message.hotelId)}`, label: 'View listing' } : null
  }
  return stay ? { href: `${PAGE_ROUTES.MY_BOOKINGS}/${encodeURIComponent(stay.reservationId)}`, label: 'View reservation' } : null
}
