// GET /api/messages/recipients?hotel_id= -> fetch eligible recipients for hotel
import { getHotelRecipients } from '../../../../utils/messages.ts';
import { getUserId } from '../../../../utils/user.ts'

export async function GET(request: Request) {
    // Validate logged in user
    const { userId } = await getUserId();
    if (!userId) {
        return Response.json({ error: 'You must be logged in to view message recipients.' }, { status: 401 });
    }

    // Validate hotel id
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotel_id');
    if (typeof hotelId !== 'string' || !hotelId.trim()) {
        return Response.json({ error: 'Required field hotel_id must be one string' }, { status: 400 });
    }

    const { data, error } = await getHotelRecipients(hotelId);

    if (error) {
        return Response.json({ data: null, error: 'Failed to get recipients for hotel' }, { status: 400 });
    }

    return Response.json({ data: data ?? [], error: null }, { status: 200 });
}