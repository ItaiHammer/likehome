import type { HotelSearchResult } from '@/app/search/components/SearchResultCard'

// Where hotel recommendations are searched (US 3.3.2): the city of the guest's latest viewed hotel, else their time zone's
export type RecommendationBasis = 'history' | 'time-zone' | 'default'

export type RecommendationPlace = {
  basis: RecommendationBasis
  city: string
  region: string | null
  country: string | null
  /** "City, Region, Country" for search(), blank parts left out */
  where: string
}

type ViewingSummary = { city?: string | null; region?: string | null; country?: string | null } | null | undefined

export const DEMO_TIME_ZONE = 'America/Los_Angeles'

const LOS_ANGELES = { city: 'Los Angeles', region: 'California', country: 'USA' }
const NEW_YORK = { city: 'New York', region: 'New York', country: 'USA' }

export function recommendationPlace(summary: ViewingSummary, timeZone?: string): RecommendationPlace {
  let basis: RecommendationBasis
  let loc: { city: string; region: string | null; country: string | null }
  if (summary?.city) {
    basis = 'history'
    loc = { city: summary.city, region: summary.region ?? null, country: summary.country ?? null }
  } else if (timeZone === DEMO_TIME_ZONE) {
    basis = 'time-zone'
    loc = LOS_ANGELES
  } else {
    basis = 'default'
    loc = NEW_YORK
  }

  const where = [loc.city, loc.region, loc.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ')

  return { basis, ...loc, where }
}

export const RECOMMENDED_CARDS = 6

// With live rates on, a LiteAPI row's stored price isn't its real one, so it asks for dates like /search does.
// Without them, stored prices hold for any dates (as on the hotel page).
export function toRecommendedCards(rows: unknown, liveRates: boolean, limit = RECOMMENDED_CARDS): HotelSearchResult[] {
  if (!Array.isArray(rows)) return []
  const cards = (rows as HotelSearchResult[]).slice(0, limit)
  if (!liveRates) return cards
  return cards.map((row): HotelSearchResult => (row.liteapi_id ? { ...row, min_price: null, price_status: 'needs-dates' } : row))
}

export function recommendationSubtitle(place: Pick<RecommendationPlace, 'basis' | 'city'>): string {
  return place.basis === 'history'
    ? `Picked from the stays you’ve viewed in ${place.city}.`
    : `A few places to stay in ${place.city} to get you started.`
}
