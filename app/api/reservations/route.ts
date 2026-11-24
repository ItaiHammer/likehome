// Reservations API
//   GET /api/reservations  -> list the logged-in user's reservations
//
// New bookings go through POST /api/checkout, which charges the card before the booking counts.
// The old POST here (US 4.1.2) saved a confirmed booking with no payment at all, so anyone
// signed in could hold rooms for free by calling it directly (QA 5.1.5, P1). Nothing in the app
// used it after checkout replaced it; without a POST export Next.js answers 405.
import { getUserId } from '../../../utils/user.ts'
import { getReservationsByAccount } from '../../../utils/reservations.ts'

export async function GET() {
  const { userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const { data, error } = await getReservationsByAccount(userId)
  if (error) {
    console.error('getReservationsByAccount failed:', error)
    return Response.json({ error: 'Could not load reservations.' }, { status: 500 })
  }
  return Response.json({ reservations: data ?? [] })
}
