// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The owner's booking calendar (homepage "This week" card and the My Listings calendar): how many rooms
// are booked each night, who arrives and leaves, and a colour per property.
import { PAGE_ROUTES } from '../constants/routes.ts'
import { addDays, formatRange, formatShort, formatWeekday, monthCells, type Month } from '../app/_components/dates.ts'
import { money, partyLabel } from './bookings.ts'
import { shortGuestName } from './home-owner.ts'
import type { BookingStage, HotelBooking } from './hotel-customers.ts'
import { plural, totalRooms } from './listing-display.ts'
import { coversNight } from './room-availability.ts'
import { parseDate } from '../utils/reservation-logic.ts'

// How many property colours the dots cycle through
export const PROPERTY_COLORS = 5

export type CalendarProperty = { id: string; name: string; rooms: number; color: number }

export type CalendarStay = {
  id: string
  hotelId: string
  hotelName: string
  guest: string
  room: string | null
  checkIn: string
  checkOut: string
  code: string
  nights: number
  guests: number | null
  children: number
  stage: Exclude<BookingStage, 'cancelled'>
  paid: number
  refunded: number
  bookedAt: string
}

// 0 nothing booked, 1 some rooms, 2 busy, 3 every room
export type BusyLevel = 0 | 1 | 2 | 3

export type CalendarDay = {
  date: string
  rooms: number
  booked: number
  level: BusyLevel
  // Guests sleeping there that night (arrivals included), then those leaving that morning
  staying: CalendarStay[]
  arrivals: CalendarStay[]
  departures: CalendarStay[]
}

type ListingLike = { id: string; name: string; rooms: { roomCount: number }[] }

// Sorted by name, so a property keeps its colour on every page that lists the same places
export function calendarProperties(listings: ListingLike[]): CalendarProperty[] {
  return [...listings]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((l, i) => ({ id: l.id, name: l.name, rooms: totalRooms(l.rooms), color: i % PROPERTY_COLORS }))
}

export const roomsAcross = (properties: CalendarProperty[]) => properties.reduce((sum, p) => sum + p.rooms, 0)

// Each booking holds one room; cancelled ones hold nothing
export function calendarStays(bookings: HotelBooking[]): CalendarStay[] {
  return bookings
    .filter((b): b is HotelBooking & { stage: CalendarStay['stage'] } => b.stage !== 'cancelled')
    .map((b) => ({
      id: b.id,
      hotelId: b.hotelId,
      hotelName: b.hotelName,
      guest: shortGuestName(b.guestName),
      room: b.roomType,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      code: b.code,
      nights: b.nights,
      guests: b.guests,
      children: b.children,
      stage: b.stage,
      paid: b.amountPaid,
      refunded: b.amountRefunded,
      bookedAt: b.bookedAt,
    }))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut) || a.id.localeCompare(b.id))
}

/** Only one property's rooms and stays, or everything for null */
export function forProperty(properties: CalendarProperty[], stays: CalendarStay[], propertyId: string | null) {
  if (!propertyId) return { properties, stays }
  return { properties: properties.filter((p) => p.id === propertyId), stays: stays.filter((s) => s.hotelId === propertyId) }
}

export function busyLevel(booked: number, rooms: number): BusyLevel {
  if (booked <= 0) return 0
  // No rooms listed: still show that someone booked
  if (rooms <= 0) return 1
  if (booked >= rooms) return 3
  return booked * 3 > rooms ? 2 : 1
}

export function calendarDay(date: string, stays: CalendarStay[], rooms: number): CalendarDay {
  const staying = stays.filter((s) => coversNight(s.checkIn, s.checkOut)(date))
  return {
    date,
    rooms,
    booked: staying.length,
    level: busyLevel(staying.length, rooms),
    staying,
    arrivals: staying.filter((s) => s.checkIn === date),
    departures: stays.filter((s) => s.checkOut === date),
  }
}

export const isFull = (day: CalendarDay) => day.level === 3

/** "3 of 8", or "Full" */
/** "3 of 8", or "3/8" where space is tight; "Full" when every room is booked */
export const bookedLabel = (day: CalendarDay, between = ' of ') => (isFull(day) ? 'Full' : `${day.booked}${between}${day.rooms}`)

// Share of rooms booked, for a fill bar (0 to 100)
export const bookedPercent = (day: CalendarDay) => (day.rooms > 0 ? Math.min(100, Math.round((day.booked / day.rooms) * 100)) : 0)

/** `count` days from `from` */
export function calendarDays(from: string, count: number, stays: CalendarStay[], rooms: number): CalendarDay[] {
  return Array.from({ length: count }, (_, i) => calendarDay(addDays(from, i), stays, rooms))
}

/** The month as calendar cells (null before the 1st), each day with its bookings */
export function monthGrid(month: Month, stays: CalendarStay[], rooms: number): (CalendarDay | null)[] {
  return monthCells(month).map((date) => (date ? calendarDay(date, stays, rooms) : null))
}

/** "Today", then weekday names */
export const dayName = (date: string, today: string) => (date === today ? 'Today' : formatWeekday(date))

/** Under one guest in the day panel: "Arrives today", "Leaves today" or "Until Dec 9" */
export function stayNote(stay: CalendarStay, date: string): string {
  if (stay.checkIn === date) return 'Arrives today'
  if (stay.checkOut === date) return 'Leaves today'
  return `Until ${formatShort(stay.checkOut)}`
}

/** "2 arrivals, nobody leaving" */
export function movementSummary(day: CalendarDay): string {
  const ins = day.arrivals.length ? plural(day.arrivals.length, 'arrival') : 'no arrivals'
  const outs = day.departures.length ? `${plural(day.departures.length, 'guest')} leaving` : 'nobody leaving'
  return `${ins[0].toUpperCase()}${ins.slice(1)}, ${outs}`
}

/** Everyone the day panel lists: guests staying that night, then those who left that morning */
export const dayGuests = (day: CalendarDay) => [...day.staying, ...day.departures]

/** "1 reservation", "3 reservations": the reservations the day panel lists */
export const reservationsLabel = (day: CalendarDay) => plural(dayGuests(day).length, 'reservation')

/** "3 of 8 rooms booked" */
export const roomsBookedLabel = (day: CalendarDay) => `${day.booked} of ${plural(day.rooms, 'room')} booked`

/** "Messages Test Inn · Standard king" */
export const stayPlace = (stay: CalendarStay, property?: CalendarProperty) =>
  [property?.name ?? stay.hotelName, stay.room].filter(Boolean).join(' · ')

const STAGE_LABELS: Record<CalendarStay['stage'], string> = { upcoming: 'Upcoming', 'in-stay': 'Staying now', past: 'Checked out' }

/** The reservation's details when its row in the day panel is opened */
export function stayDetails(stay: CalendarStay): { label: string; value: string }[] {
  const paid = stay.refunded > 0 ? `${money(stay.paid)} · ${money(stay.refunded)} refunded` : money(stay.paid)
  return [
    { label: 'Reservation', value: stay.code },
    { label: 'Dates', value: `${formatRange(stay.checkIn, stay.checkOut)} · ${plural(stay.nights, 'night')}` },
    ...(stay.guests ? [{ label: 'Guests', value: partyLabel(stay.guests, stay.children) }] : []),
    { label: 'Status', value: STAGE_LABELS[stay.stage] },
    { label: 'Paid', value: paid },
    { label: 'Booked', value: formatShort(stay.bookedAt.slice(0, 10)) },
  ]
}

/** A ?date= value the calendar can open on, or null */
export const calendarDateParam = (value: unknown): string | null => (parseDate(value) ? (value as string) : null)

export const CALENDAR_ANCHOR = 'calendar'

/** A ?stay= value: the id of a reservation the panel lists on `date`, or null */
export const calendarStayParam = (value: unknown, date: string, stays: CalendarStay[]): string | null =>
  typeof value === 'string' && dayGuests(calendarDay(date, stays, 0)).some((s) => s.id === value) ? value : null

/** My Listings with the calendar open on that date, and on that reservation's details when given */
export function calendarHref(date?: string, stayId?: string) {
  const query = new URLSearchParams()
  if (date) query.set('date', date)
  if (date && stayId) query.set('stay', stayId)
  const search = query.toString()
  return `${PAGE_ROUTES.LISTINGS}${search ? `?${search}` : ''}#${CALENDAR_ANCHOR}`
}
