// GET /api/messages/[id] -> fetch single message
// DELETE /api/messages/[id] -> hide a message from the signed-in recipient (sets hidden_at)
import { getMessage, hideMessage } from '../../../../utils/messages.ts';
import { getUserId } from '../../../../utils/user.ts'

// The column or its update grant isn't there yet (undefined column, schema cache miss, no privilege)
const NOT_SET_UP = new Set(['42703', 'PGRST204', '42501']);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  // Validate logged in user
  const { userId } = await getUserId();
  if (!userId) {
    return Response.json({ error: 'You must be logged in to view messages.' }, { status: 401 });
  }

  // Get id
  const { id } = await params;
  const { data, error } = await getMessage(id);

  if (error) {
    return Response.json({ data: null, error: 'Failed to get message with id' }, { status: 400 });
  }

  if (data?.hidden_at && data.recipient_id === userId) {
    return Response.json({ data: null, error: 'Message not found' }, { status: 404 });
  }

  return Response.json({ data, error: null }, { status: 200 });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await getUserId();
  if (!userId) {
    return Response.json({ error: 'You must be logged in to delete messages.' }, { status: 401 });
  }

  const { id } = await params;
  const { count, error } = await hideMessage(id, userId);

  if (error) {
    if (NOT_SET_UP.has(error.code ?? '')) {
      return Response.json({ data: null, error: 'Deleting messages isn’t available yet.' }, { status: 501 });
    }
    return Response.json({ data: null, error: 'Failed to delete message' }, { status: 500 });
  }
  if (count === 0) {
    return Response.json({ data: null, error: 'Message not found' }, { status: 404 });
  }

  return Response.json({ data: { id }, error: null }, { status: 200 });
}
