// POST /api/messages -> send message to recipient(s)
// GET /api/messages -> fetch inbox (personal) or sent (business, with ?hotel_id=)

import { type SendMessagePayload } from '../../../types/messages.ts'
import { getUserId } from '../../../utils/user.ts'
import {
    createMessages,
    getMessagesByAccount,
    getMessagesByHotel
} from '../../../utils/messages.ts'
import { getAccountType } from '../../../utils/accounts.ts';

// POST /api/messages -> send message to recipient(s)
export async function POST(request: Request) {
  // Validate logged in user
  const { userId } = await getUserId();
  if (!userId) {
    return Response.json({ error: 'You must be logged in to send messages.' }, { status: 401 });
  }

  // Validate payload
  let payload: SendMessagePayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { hotel_id, subject, body, recipient_ids } = payload;
  if (typeof hotel_id !== 'string' || typeof subject !== 'string' || typeof body !== 'string') {
    return Response.json({ data: null, error: 'Required fields must be strings: hotel_id, subject, body' }, { status: 400 });
  }
  if (!hotel_id.trim() || !subject.trim() || !body.trim()) {
    return Response.json({ data: null, error: 'Missing required fields: hotel_id, subject, body' }, { status: 400 });
  }

  // Format recipient ids input
  let recipientIds: string[];
  if (typeof recipient_ids === 'string') {
    if (!recipient_ids.trim()) { 
        return Response.json({ data: null, error: 'Missing required field: recipient_ids' }, { status: 400 });
    }
    recipientIds = [recipient_ids.trim()];
  } else if (Array.isArray(recipient_ids)) {
    if (recipient_ids.some(id => typeof id !== 'string')){
        return Response.json({ data: null, error: 'Required field recipient_ids must be of type string or string[]' }, { status: 400 });
    }
    recipientIds = recipient_ids
        .map(id => id.trim())
        .filter(id => id.length > 0);
    if (recipientIds.length < 1) { 
        return Response.json({ data: null, error: 'Missing required field: recipient_ids' }, { status: 400 });
    }
  } else {
    return Response.json({ data: null, error: 'Incorrect type of required field: recipient_ids' }, { status: 400 });
  }

  // Send messages to recipients
  const { data, error } = await createMessages(
    hotel_id.trim(),
    recipientIds,
    subject.trim(),
    body.trim()
  );

  if (error || !data || data.length < 1) {
    return Response.json({ data: null, error: 'Failed to create messages' }, { status: 400 });
  }

  return Response.json({ data, error: null }, { status: 201 });
}

// GET /api/messages -> fetch inbox (personal) or sent (business, with ?hotel_id=)
export async function GET(request: Request) {
  // Validate logged in user
  const { userId } = await getUserId();
  if (!userId) {
    return Response.json({ error: 'You must be logged in to view messages.' }, { status: 401 });
  }

  const { data: accountType, error } = await getAccountType(userId);
  if (!accountType || error) {
    return Response.json({ error: 'Failed to retrieve logged in user\'s account type.' }, { status: 401 });
  }

  switch (accountType) {
    case 'business':
        return getBusinessMessages(request);
    case 'personal':
        return getPersonalMessages(userId);
    default:
        return Response.json({ error: 'Unexpected logged in user\'s account type.' }, { status: 401 });
  }
}

async function getBusinessMessages(request: Request) {
  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get('hotel_id');
  if (typeof hotelId !== 'string' || !hotelId.trim()) {
    return Response.json({ error: 'Required field hotel_id must be one string' }, { status: 400 });
  }

  const { data, error } = await getMessagesByHotel(hotelId);
  
  if (error) {
    return Response.json({ data: null, error: 'Failed to get messages for hotel id' }, { status: 400 });
  }

  return Response.json({ data: data ?? [], error: null }, { status: 200 });
}

async function getPersonalMessages(userId: string) {
    // ignores hotel_id param even if provided
    const { data, error } = await getMessagesByAccount(userId);
    
    if (error) {
        return Response.json({ data: null, error: 'Failed to get messages for user' }, { status: 400 });
    }

    return Response.json({ data: data ?? [], error: null }, { status: 200 });
}
