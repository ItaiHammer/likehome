// Relative .ts imports so Node tests can load this file
import { getRecentlyViewedSummary } from './recommend.ts'
import { search } from '../app/search/search.ts'
import { recommendationPlace } from '../lib/recommendations.ts'
import type { RecommendationPlace } from '../lib/recommendations.ts'
import type { SearchResponse } from '../app/search/types.ts'

// Cara's recommendation search, shared by GET /api/recommend and the home page
export async function getRecommendedStays(
  timeZone?: string
): Promise<{ place: RecommendationPlace; output: SearchResponse }> {
  // Signed out (401) or a failed read: carry on without the viewing history
  const { data } = await getRecentlyViewedSummary()
  const place = recommendationPlace(data, timeZone)

  const minPrice = typeof data?.minPrice === 'number' ? data.minPrice.toString() : undefined
  const maxPrice = typeof data?.maxPrice === 'number' ? data.maxPrice.toString() : undefined

  const output = await search({ where: place.where, minPrice, maxPrice, tz: timeZone })
  return { place, output }
}
