// GET /api/recommend
// location of most recently viewed or timezone AND min and max price of recently viewed
import { getRecentlyViewedSummary } from '../../../utils/recommend.ts';
import { search } from '../../../app/search/search.ts'

export async function GET(request: Request) {
  // timezone
  const { searchParams } = new URL(request.url);
  const timeZone = typeof (searchParams.get('time_zone')) === 'string'
    ? searchParams.get('time_zone') as string
    : undefined;

  // If missing data from error or otherwise, proceed without it
  const { data } = await getRecentlyViewedSummary();

  const loc = data?.city
    ? { city: data.city, region: data.region, country: data.country }
    : timeZone === 'America/Los_Angeles' // demo timezone
    ? { city: 'Los Angeles', region: 'California', country: 'USA' }
    : { city: 'New York', region: 'New York', country: 'USA' };
  
  const location = [loc.city, loc.region, loc.country]
    .filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
    .join(', ');

  const minPrice = typeof data?.minPrice === 'number' ? data.minPrice.toString() : undefined;
  const maxPrice = typeof data?.maxPrice === 'number' ? data.maxPrice.toString() : undefined;

  // search for recommended results
  const results = await search({
    where: location,
    minPrice,
    maxPrice,
    tz: timeZone
  });

  return Response.json({ data: results });
}