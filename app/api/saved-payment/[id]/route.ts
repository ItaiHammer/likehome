// DELETE /api/saved-payment/[id] -> remove one of the signed-in account's saved cards.
// Past payments keep their own last 4 digits; their link to the card is cleared by the database.
import { getUserId } from '@/utils/user'
import { deleteSavedPaymentMethod } from '@/utils/saved-payment-methods'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await getUserId()
  if (!userId) {
    return Response.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const { id } = await params
  const { deleted, error } = await deleteSavedPaymentMethod(id, userId)
  // 22P02: not a uuid, so no such card
  if (error?.code === '22P02') {
    return Response.json({ error: 'Saved card not found.' }, { status: 404 })
  }
  if (error) {
    console.error('deleteSavedPaymentMethod failed:', { code: error.code })
    return Response.json({ error: 'Could not remove this card.' }, { status: 500 })
  }
  if (!deleted) {
    return Response.json({ error: 'Saved card not found.' }, { status: 404 })
  }
  return new Response(null, { status: 204 })
}
