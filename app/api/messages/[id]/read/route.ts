// PATCH /api/messages/[id]/read -> mark message as read

import { getMessage, markMessageRead } from '../../../../../utils/messages.ts';
import { getUserId } from '../../../../../utils/user.ts'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  // Validate logged in user
  const { userId } = await getUserId();
  if (!userId) {
    return Response.json({ error: 'You must be logged in to mark messages read.' }, { status: 401 });
  }

  // Get id
  const { id } = await params;
  // Check visibility before updating: a hidden row can still be visible to its recipient under
  // older RLS policies. Reading * keeps this compatible with schemas without hidden_at.
  const before = await getMessage(id);
  if (before.error && before.error.code !== 'PGRST116') {
    return Response.json({ data: null, error: 'Failed to mark message read' }, { status: 500 });
  }
  if (!before.data || before.data.recipient_id !== userId || before.data.hidden_at) {
    return Response.json({ data: null, error: 'Message not found' }, { status: 404 });
  }
  if (before.data.read_at) {
    return Response.json({ data: [before.data], error: null }, { status: 200 });
  }

  const { data, error } = await markMessageRead(id);

  if (error) {
    return Response.json({ data: null, error: 'Failed to mark message read' }, { status: 500 });
  }

  // Another tab may have marked it between the read and update. Verify the no-op rather
  // than treating every empty update (including a failed policy check) as already read.
  if (!data || data.length < 1) {
    const existing = await getMessage(id);
    if (existing.error && existing.error.code !== 'PGRST116') {
      return Response.json({ data: null, error: 'Failed to mark message read' }, { status: 500 });
    }
    const message = existing.data;
    if (!message || message.recipient_id !== userId || message.hidden_at) {
      return Response.json({ data: null, error: 'Message not found' }, { status: 404 });
    }
    if (!message.read_at) {
      return Response.json({ data: null, error: 'Failed to mark message read' }, { status: 500 });
    }
    return Response.json({ data: [message], error: null }, { status: 200 });
  }

  // A hidden message must stay unavailable through this endpoint too. Check returned rows
  // rather than filtering on hidden_at in SQL, since older schemas do not have that column.
  if (data.some((message) => message.recipient_id !== userId || message.hidden_at)) {
    return Response.json({ data: null, error: 'Message not found' }, { status: 404 });
  }

  return Response.json({ data, error: null }, { status: 200 });
}
