// GET /api/messages/[id] -> fetch single message
import { getMessage } from '../../../../utils/messages.ts';
import { getUserId } from '../../../../utils/user.ts'

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

  return Response.json({ data, error: null }, { status: 200 });
}