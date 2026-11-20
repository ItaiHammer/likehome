// "Book again" for a past stay. No Supabase / Next.js imports here so it can be unit tested with `npm test`.

// Reservations only store a total guest count, so everyone comes back as an adult (1–16, what the page accepts)
export function rebookHref(stay: { hotelId: string; roomId: string; checkIn: string; checkOut: string; guests: number }): string {
  const adults = Math.min(Math.max(stay.guests, 1), 16)
  const query = new URLSearchParams({
    room: stay.roomId,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(adults),
    children: '0',
  })
  return `/reserve/${stay.hotelId}?${query}`
}
