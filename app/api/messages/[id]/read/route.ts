// PATCH /api/messages/[id]/read -> mark message as read

import { markMessageRead } from '../../../../../utils/messages.ts';
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
  const { data, error } = await markMessageRead(id);

  if (error || !data || data.length < 1) {
    return Response.json({ data: null, error: 'Failed to mark message read' }, { status: 400 });
  }

  return Response.json({ data, error: null }, { status: 200 });
}