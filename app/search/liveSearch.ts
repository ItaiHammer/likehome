import { countryName, listingTagsFor, listsAdultsOnly, stripHtml } from '../../lib/liteapi/import-mapping.ts';
import type { LiteHotelListing } from '../../lib/liteapi/types.ts';
import { sortByPrice } from './livePrices.ts';
import type { HotelSearchResult } from './components/SearchResultCard';
import type { PropertyFilter } from './types.ts';

export function listingRow(hotel: LiteHotelListing, names: Map<number, string>): HotelSearchResult {
    return {
        liteapi_id: hotel.id,
        name: hotel.name,
        description: stripHtml(hotel.hotelDescription ?? ''),
        address: hotel.address ?? null,
        city: hotel.city || null,
        country: hotel.country ? countryName(hotel.country) : null,
        photo_urls: hotel.main_photo ? [hotel.main_photo] : [],
        rating: typeof hotel.stars === 'number' && hotel.stars > 0 ? hotel.stars : null,
        tags: listingTagsFor(hotel.facilityIds, names),
        min_price: null,
    };
}

// Bed counts, bed sizes and cribs need the rooms, which only a saved hotel has
function listingMatches(row: HotelSearchResult, hotel: LiteHotelListing, p: PropertyFilter): boolean {
    if (p.beds) {
        return false;
    }
    if (p.guests?.children && listsAdultsOnly(hotel.facilityIds)) {
        return false;
    }
    if (p.rating?.minStars && !(Number(row.rating) >= p.rating.minStars)) {
        return false;
    }
    return (p.tags ?? []).every((tag) => row.tags?.includes(tag));
}

/**
 * Owner listings first, then LiteAPI's hotels in LiteAPI's order, then saved LiteAPI hotels the place list didn't
 * include. A saved hotel comes from search_hotels, which already checked its rooms, so one missing there failed the
 * filters; an unsaved one is checked here.
 */
export function mergeLiveResults(
    dbRows: HotelSearchResult[],
    listings: LiteHotelListing[],
    savedIds: Set<string>,
    names: Map<number, string>,
    p: PropertyFilter,
): HotelSearchResult[] {
    const fromDb = new Map(dbRows.flatMap((row) => (row.liteapi_id ? [[row.liteapi_id, row] as const] : [])));
    const listed: HotelSearchResult[] = [];
    for (const hotel of listings) {
        const row = listingRow(hotel, names);
        const saved = fromDb.get(hotel.id);
        if (saved) {
            // search_hotels returns neither stars nor tags
            listed.push({ ...row, ...saved, rating: saved.rating ?? row.rating, tags: saved.tags ?? row.tags });
            fromDb.delete(hotel.id);
        } else if (!savedIds.has(hotel.id) && listingMatches(row, hotel, p)) {
            listed.push(row);
        }
    }
    return [...dbRows.filter((row) => !row.liteapi_id), ...listed, ...fromDb.values()];
}

// LiteAPI can't price a stay without dates, and a stored price is only a sample, so LiteAPI hotels show none
export function withoutDates(rows: HotelSearchResult[], p: PropertyFilter): HotelSearchResult[] {
    const shown = rows
        .filter((row) => !(row.liteapi_id && p.price))
        .map((row): HotelSearchResult => (row.liteapi_id ? { ...row, min_price: null, price_status: 'needs-dates' } : row));
    return sortByPrice(shown, p.sort);
}
