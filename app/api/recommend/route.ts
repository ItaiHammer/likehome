// GET /api/recommend
// location of most recently viewed or timezone AND min and max price of recently viewed
import { getRecommendedStays } from '../../../utils/recommended-stays.ts';

export async function GET(request: Request) {
  // timezone
  const { searchParams } = new URL(request.url);
  const timeZone = typeof (searchParams.get('time_zone')) === 'string'
    ? searchParams.get('time_zone') as string
    : undefined;

  // search for recommended results (the place and price range are picked in getRecommendedStays)
  const { output } = await getRecommendedStays(timeZone);
  
  const error = output?.results?.error;
  
  if (error) {
    return Response.json({ data: null, error: error }, { status: 400 });
  }

  return Response.json({ data: output, error: null }, { status: 200 });
}
