// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The owner's booking calendar (homepage "This week" card and the My Listings calendar): how many rooms
// are booked each night, who arrives and leaves, and a colour per property.
import { PAGE_ROUTES } from '../constants/routes.ts'
import { addDays, formatShort, formatWeekday, monthCells, type Month } from '../app/_components/dates.ts'
import { shortGuestName } from './home-owner.ts'
import type { HotelBooking } from './hotel-customers.ts'
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
    .filter((b) => b.stage !== 'cancelled')
    .map((b) => ({
      id: b.id,
      hotelId: b.hotelId,
      hotelName: b.hotelName,
      guest: shortGuestName(b.guestName),
      room: b.roomType,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
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

export type Movement = { kind: 'arrives' | 'leaves'; date: string; stay: CalendarStay }

/** Arrivals and departures over these days, in date order, arrivals first on each day */
export function movements(days: CalendarDay[]): Movement[] {
  return days.flatMap((d) => [
    ...d.arrivals.map((stay) => ({ kind: 'arrives' as const, date: d.date, stay })),
    ...d.departures.map((stay) => ({ kind: 'leaves' as const, date: d.date, stay })),
  ])
}

/** "Arrives today", "Leaves Thu" */
export function movementLabel(m: Movement, today: string): string {
  return `${m.kind === 'arrives' ? 'Arrives' : 'Leaves'} ${m.date === today ? 'today' : formatWeekday(m.date)}`
}

/** "Today", then weekday names */
export const dayName = (date: string, today: string) => (date === today ? 'Today' : formatWeekday(date))

export const CALENDAR_HINT = 'Each day opens the full calendar on that date.'

/** The week card's note on its first full night: "Friday is full" */
export function fullNightNote(days: CalendarDay[], today: string): { title: string; body: string } | null {
  const full = days.find(isFull)
  if (!full) return null
  const name = full.date === today ? 'Tonight' : formatWeekday(full.date, true)
  const rooms = full.rooms === 1 ? 'Your only room is' : `All ${full.rooms} rooms are`
  return { title: `${name} is full`, body: `${rooms} booked. ${CALENDAR_HINT}` }
}

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

/** "3 of 8 rooms booked" */
export const roomsBookedLabel = (day: CalendarDay) => `${day.booked} of ${plural(day.rooms, 'room')} booked`

/** "Messages Test Inn · Standard king" */
export const stayPlace = (stay: CalendarStay, property?: CalendarProperty) =>
  [property?.name ?? stay.hotelName, stay.room].filter(Boolean).join(' · ')

/** A ?date= value the calendar can open on, or null */
export const calendarDateParam = (value: unknown): string | null => (parseDate(value) ? (value as string) : null)

export const CALENDAR_ANCHOR = 'calendar'

/** My Listings with the calendar open on that date */
export const calendarHref = (date?: string) => `${PAGE_ROUTES.LISTINGS}${date ? `?date=${date}` : ''}#${CALENDAR_ANCHOR}`
