// Pure reservation business logic (US 4.1.2).
// No Supabase / Next.js imports here so it can be unit tested with `npm test`.

export type ReservationInput = {
  room_id: string
  check_in: string // YYYY-MM-DD
  check_out: string // YYYY-MM-DD
  guests?: number
  // The party breakdown, when the client sends it; checked against the room's own limits
  adults?: number
  /** How many of the guests are children */
  children?: number
}

export type RoomForBooking = {
  id: string
  hotel_id: string
  price_per_night: number | string
  capacity: number | null
  room_type?: string
  liteapi_room_id?: string | null
  hotels?: { liteapi_id: string | null } | null
  // Per-room limits (null = no separate limit beyond capacity)
  max_adults?: number | null
  max_children?: number | null
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

/**
 * Today's date as YYYY-MM-DD in the guest's own time zone (an IANA name such as
 * "America/Los_Angeles", sent by the browser). Falls back to UTC when the zone is
 * missing or not a real zone, so a bad value can never break validation.
 *
 * Why: at 6pm Pacific it is already tomorrow in UTC, so judging "today" in UTC
 * rejected same-day check-ins for US guests every evening.
 */
export function todayInTimeZone(timeZone: unknown, now: Date = new Date()): string {
  if (typeof timeZone !== 'string' || timeZone.trim() === '') return todayUTC(now)
  try {
    // en-CA formats dates as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone.trim(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return todayUTC(now)
  }
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

  let adults: number | undefined
  if (b.adults !== undefined) {
    if (typeof b.adults !== 'number' || !Number.isInteger(b.adults) || b.adults < 1) {
      return { ok: false, error: 'adults must be a whole number of at least 1.' }
    }
    adults = b.adults
  }
  // null too: a booking change merges in the saved reservation
  let children: number | undefined
  if (b.children != null) {
    if (typeof b.children !== 'number' || !Number.isInteger(b.children) || b.children < 0) {
      return { ok: false, error: 'children must be a whole number (0 or more).' }
    }
    children = b.children
  }
  // Always end with a full party (guests, adults and children) whenever any of them is given, so the
  // room's adult/child limits are always checked and the child count is always saved (audit R2, R4).
  // - No split at all: everyone counts as an adult, the strictest reading of the room's limits.
  // - Only children (e.g. a saved booking, which stores guests and children but not adults):
  //   adults are the rest of the guests.
  // - Only adults: children are the rest of the guests (0 without a guest count).
  if (adults === undefined && children === undefined) {
    if (guests !== undefined) {
      adults = guests
      children = 0
    }
  } else if (adults === undefined) {
    if (guests === undefined) {
      return { ok: false, error: 'adults is required with children.' }
    }
    adults = guests - (children as number)
    if (adults < 1) {
      return { ok: false, error: 'Every booking needs at least 1 adult.' }
    }
  } else if (children === undefined) {
    children = guests === undefined ? 0 : guests - adults
    if (children < 0) {
      return { ok: false, error: 'guests must equal adults plus children.' }
    }
  }
  if (adults !== undefined && children !== undefined) {
    const party = adults + children
    if (guests === undefined) guests = party
    else if (guests !== party) {
      return { ok: false, error: 'guests must equal adults plus children.' }
    }
  }

  return {
    ok: true,
    value: {
      room_id: b.room_id.trim(),
      check_in: checkIn,
      check_out: checkOut,
      guests,
      ...(adults !== undefined ? { adults } : {}),
      ...(children !== undefined ? { children } : {}),
    },
  }
}

/** The adults and children a booking is priced for. Without a guest count, 2 adults, like the stay page. */
export function bookingParty(input: Pick<ReservationInput, 'guests' | 'children'>): { adults: number; children: number } {
  const children = input.children ?? 0
  return { adults: (input.guests ?? 2) - children, children }
}

/**
 * Checks the adults/children split against the room's own limits (a room can fit 4 people but
 * only 2 adults, or be adults-only). Returns an error message or null. validateReservationInput
 * always fills in the split when a guest count is given (no split = all adults).
 */
export function checkPartyLimits(
  party: { adults?: number; children?: number },
  room: RoomForBooking
): string | null {
  if (party.adults !== undefined && room.max_adults != null && party.adults > room.max_adults) {
    return `This room allows up to ${room.max_adults} adult${room.max_adults === 1 ? '' : 's'}.`
  }
  if (party.children !== undefined && room.max_children != null && party.children > room.max_children) {
    return room.max_children === 0
      ? 'This room is for adults only.'
      : `This room allows up to ${room.max_children} child${room.max_children === 1 ? '' : 'ren'}.`
  }
  return null
}

/** Checks the requested guest count against the room's capacity. Returns an error message or null. */
export function checkCapacity(guests: number | undefined, room: RoomForBooking): string | null {
  if (guests === undefined || room.capacity == null) return null
  if (guests > room.capacity) {
    return `This room fits up to ${room.capacity} guest${room.capacity === 1 ? '' : 's'}.`
  }
  return null
}
