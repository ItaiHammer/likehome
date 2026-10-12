// No Supabase / Next.js imports here so it can be unit tested with `npm test`.

export type Booking = {
  id: string
  checkIn: string
  checkOut: string
  guests: number | null
  status: string
  hotelName: string
  city: string | null
  photoUrl: string | null
  roomType: string | null
}

// A stay that's under way (checked in, check-out still ahead) counts as upcoming
export function groupBookings(bookings: Booking[], today: string) {
  const upcoming: Booking[] = []
  const past: Booking[] = []
  const cancelled: Booking[] = []
  for (const booking of bookings) {
    if (booking.status === 'cancelled') cancelled.push(booking)
    else if (booking.status !== 'completed' && booking.checkOut > today) upcoming.push(booking)
    else past.push(booking)
  }
  upcoming.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  past.sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  cancelled.sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  return { upcoming, past, cancelled }
}

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function formatStayDates(checkIn: string, checkOut: string): string {
  const start = new Date(`${checkIn}T00:00:00Z`)
  const end = new Date(`${checkOut}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${checkIn} - ${checkOut}`

  const year = end.getUTCFullYear()
  if (start.getUTCFullYear() !== year) {
    return `${monthDay.format(start)}, ${start.getUTCFullYear()} - ${monthDay.format(end)}, ${year}`
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${monthDay.format(start)} - ${monthDay.format(end)}, ${year}`
  }
  return `${monthDay.format(start)} - ${end.getUTCDate()}, ${year}`
}

// There's no booking-code column yet, so the code is derived from the reservation id
export function bookingCode(id: string): string {
  return `LH-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export function bookingSummary(booking: Booking): string {
  const guests = booking.guests ? `${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}` : null
  return [formatStayDates(booking.checkIn, booking.checkOut), booking.roomType, guests].filter(Boolean).join(' · ')
}

// Whole dollars stay whole ($756); anything with cents shows both digits ($1,234.50)
export const money = (n: number) => {
  const cents = Math.round(n * 100) / 100
  return `$${cents.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(cents) ? 0 : 2, maximumFractionDigits: 2 })}`
}

export function firstName(fullName: string | null | undefined): string | null {
  return fullName?.trim().split(/\s+/)[0] || null
}

export function initials(fullName: string | null | undefined, email: string | null | undefined): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  return (words[0]?.[0] ?? email?.trim()[0] ?? '?').toUpperCase()
}
