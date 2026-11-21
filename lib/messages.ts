// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// Messages are one-way: a hotel owner sends to guests with a reservation there. Rows come from
// the /api/messages JSON, so every shape is checked.

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

export type BellSummary = { unread: number; latest: InboxMessage[] }

const BELL_LATEST = 5

/**
 * What the header bell shows: the unread count for the whole inbox, and the first `limit`
 * messages (the inbox is newest first) with bodies already cut down by preview().
 */
export function bellSummary(messages: InboxMessage[], limit = BELL_LATEST): BellSummary {
  if (!Array.isArray(messages)) return { unread: 0, latest: [] }
  const n = Number.isFinite(limit) && limit >= 0 ? Math.floor(limit) : BELL_LATEST
  return {
    unread: unreadCount(messages),
    latest: messages.slice(0, n).map((m) => ({ ...m, body: preview(m.body) })),
  }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Calendar wording uses the viewer's local day. A time slightly ahead of `now` (clock skew) is "Just now".
export function relativeTime(iso: string, now: Date): string {
  if (typeof iso !== 'string' || !iso.trim() || !(now instanceof Date)) return ''
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`
  if (diff < DAY || sameLocalDay(then, now)) return `${Math.floor(diff / HOUR)} hr ago`
  if (sameLocalDay(then, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Yesterday'
  const day = `${MONTHS[then.getMonth()]} ${then.getDate()}`
  return then.getFullYear() === now.getFullYear() ? day : `${day}, ${then.getFullYear()}`
}

export function markRead(messages: InboxMessage[], id: string, at: string): InboxMessage[] {
  if (!Array.isArray(messages)) return []
  if (!filled(at)) return [...messages]
  return messages.map((m) => (m?.id === id && isUnread(m) ? { ...m, readAt: at } : m))
}
