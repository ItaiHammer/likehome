// Pure reservation business logic (US 4.1.2).
// No Supabase / Next.js imports here so it can be unit tested with `npm test`.

export type ReservationInput = {
  room_id: string
  check_in: string // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
  guests?: number
}

export type RoomForBooking = {
  id: string
  hotel_id: string
  price_per_night: number | string
  capacity: number | null
}

export type ValidationResult =
  | { ok: true; value: ReservationInput }
  | { ok: false; error: string }

export const MAX_NIGHTS = 30

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Parses a YYYY-MM-DD string as a UTC date. Returns null if it isn't a real calendar date. */
export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  // Reject roll-overs like 2026-02-30 -> 2026-03-02
  if (date.toISOString().slice(0, 10) !== value) return null
  return date
}

/** Today's date as YYYY-MM-DD (UTC). */
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Number of nights between check-in and check-out. */
export function countNights(checkIn: string, checkOut: string): number {
  const inDate = parseDate(checkIn)
  const outDate = parseDate(checkOut)
  if (!inDate || !outDate) return 0
  return Math.round((outDate.getTime() - inDate.getTime()) / 86_400_000)
}

/** nights × price_per_night, rounded to cents. */
export function calculateTotalPrice(
  checkIn: string,
  checkOut: string,
  pricePerNight: number | string
): number {
  const nights = countNights(checkIn, checkOut)
  const price = Number(pricePerNight)
  return Math.round(nights * price * 100) / 100
}

/**
 * True if two stays overlap. Check-out day is free, so back-to-back
 * stays (one checks out the day the other checks in) do NOT overlap.
 */
export function datesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string
): boolean {
  return aIn < bOut && aOut > bIn
}

/** Validates the request body for creating a reservation. */
export function validateReservationInput(
  body: unknown,
  today: string = todayUTC()
): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }
  const b = body as Record<string, unknown>

  if (typeof b.room_id !== 'string' || b.room_id.trim() === '') {
    return { ok: false, error: 'room_id is required.' }
  }
  if (!parseDate(b.check_in)) {
    return { ok: false, error: 'check_in must be a valid date (YYYY-MM-DD).' }
  }
  if (!parseDate(b.check_out)) {
    return { ok: false, error: 'check_out must be a valid date (YYYY-MM-DD).' }
  }
  const checkIn = b.check_in as string
  const checkOut = b.check_out as string

  if (checkIn < today) {
    return { ok: false, error: 'check_in cannot be in the past.' }
  }
  if (checkOut <= checkIn) {
    return { ok: false, error: 'check_out must be after check_in.' }
  }
  if (countNights(checkIn, checkOut) > MAX_NIGHTS) {
    return { ok: false, error: `Stays are limited to ${MAX_NIGHTS} nights.` }
  }

  let guests: number | undefined
  if (b.guests !== undefined) {
    if (typeof b.guests !== 'number' || !Number.isInteger(b.guests) || b.guests < 1) {
      return { ok: false, error: 'guests must be a whole number of at least 1.' }
    }
    guests = b.guests
  }

  return {
    ok: true,
    value: { room_id: b.room_id.trim(), check_in: checkIn, check_out: checkOut, guests },
  }
}

/** Checks the requested guest count against the room's capacity. Returns an error message or null. */
export function checkCapacity(guests: number | undefined, room: RoomForBooking): string | null {
  if (guests === undefined || room.capacity == null) return null
  if (guests > room.capacity) {
    return `This room fits up to ${room.capacity} guest${room.capacity === 1 ? '' : 's'}.`
  }
  return null
}
