// Account Details (phone + address), stored on the signed-in user's default saved traveler.
//   GET   /api/saved-travelers -> { traveler } (null if none yet)
//   PATCH /api/saved-travelers -> save { phone, street, city, state, zip }
import { getUserId } from '@/utils/user'
import { getSavedTravelersByAccount, saveAccountDetails } from '@/utils/saved-travelers'

export async function GET() {
  const { userId } = await getUserId()
  if (!userId) return Response.json({ error: 'You must be logged in.' }, { status: 401 })

  const { data, error } = await getSavedTravelersByAccount(userId)
  if (error) return Response.json({ error: 'Could not load account details.' }, { status: 500 })
  return Response.json({ traveler: data?.find((t) => t.is_default) ?? null })
}

export async function PATCH(request: Request) {
  const { userId } = await getUserId()
  if (!userId) return Response.json({ error: 'You must be logged in.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  // Blank fields are saved as null, which the table's checks allow
  const field = (key: string) => (typeof body[key] === 'string' && body[key].trim()) || null
  const { data, error } = await saveAccountDetails(userId, {
    phone: field('phone'),
    street: field('street'),
    city: field('city'),
    state: field('state'),
    zip: field('zip'),
  })
  if (error) return Response.json({ error: 'Could not save account details.' }, { status: 400 })
  return Response.json({ traveler: data })
}
