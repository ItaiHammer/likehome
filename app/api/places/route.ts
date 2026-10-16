//   GET /api/places?q=bend -> up to 5 LiteAPI places for the destination field: { places: [{ placeId, name, region }] }
import { placeSuggestions } from '../../../lib/liteapi/catalog.ts'

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? ''
  const places = (await placeSuggestions(q)).slice(0, 5).map((place) => ({
    placeId: place.placeId,
    name: place.displayName,
    region: place.formattedAddress ?? '',
  }))
  // The same text always finds the same places, so browsers may reuse an answer for an hour
  return Response.json({ places }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
