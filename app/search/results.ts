import { getSearchParams, search } from './search.ts';
import { priceSearchResults, quotePage } from './livePrices.ts';
import { mergeLiveResults, withoutDates } from './liveSearch.ts';
import { savedLiteapiIds } from '../../utils/liteapi-hotels.ts';
import type { LiteHotelListing } from '../../lib/liteapi/types.ts';
import type { HotelSearchResult } from './components/SearchResultCard';
import type { SearchRequest, SearchResponse } from './types.ts';

export const PAGE_SIZE = 21;
// search_hotels caps p_limit at 100
export const LIVE_CANDIDATES = 100;

export type LiveListing = { hotels: LiteHotelListing[]; names: Map<number, string> };

export type SearchResults = {
    data: HotelSearchResult[];
    total: number;
    quoted: Promise<HotelSearchResult[]> | null;
    /** Only the first LIVE_CANDIDATES matches were priced, so there may be more */
    capped: boolean;
};

function rowsOf({ results }: SearchResponse): HotelSearchResult[] {
    if (results.error) {
        throw results.error;
    }
    return Array.isArray(results.data) ? (results.data as HotelSearchResult[]) : [];
}

const checking = (row: HotelSearchResult): HotelSearchResult => (row.liteapi_id ? { ...row, min_price: null, price_status: 'checking' } : row);

// listing: LiteAPI's hotels for the searched place, or null to search the database alone
export async function searchResults(request: SearchRequest, page: number, listing: LiveListing | null): Promise<SearchResults> {
    const p = getSearchParams(request);
    // A LiteAPI hotel's price is live (with dates) or unknown (without), which the SQL can't range or sort by
    const byPrice = Boolean(p.price) || p.sort === 'price-low' || p.sort === 'price-high';
    const candidates = { page: 1, pageSize: LIVE_CANDIDATES };
    const pageOf = (list: HotelSearchResult[]) => list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // A page past the end reads "0 stays found", as the SQL paging does
    const paged = (list: HotelSearchResult[], capped = false): SearchResults => {
        const data = pageOf(list);
        return { data, total: data.length ? list.length : 0, quoted: null, capped };
    };

    if (listing) {
        const ids = listing.hotels.map((hotel) => hotel.id);
        const [found, savedIds] = await Promise.all([search(request, candidates, ids), savedLiteapiIds(ids)]);
        const rows = rowsOf(found);
        const matches = Number(found.results.total ?? rows.length);
        const complete = matches <= rows.length;
        const owners = complete ? [] : await ownersPastLimit(request, ids, rows, matches);
        const merged = mergeLiveResults([...rows, ...owners], listing.hotels, savedIds, listing.names, p, complete);
        if (!p.dates) {
            return paged(withoutDates(merged, p));
        }
        if (byPrice) {
            // Only live prices can order or range these, so the page waits for them
            return paged(await priceSearchResults(merged, p));
        }
        const shown = pageOf(merged);
        return { data: shown.map(checking), total: shown.length ? merged.length : 0, quoted: quotePage(shown, p), capped: false };
    }

    if (!byPrice) {
        const found = await search(request, { page, pageSize: PAGE_SIZE });
        const rows = rowsOf(found);
        const total = Number(found.results.total ?? 0);
        return p.dates
            ? { data: rows.map(checking), total, quoted: quotePage(rows, p), capped: false }
            : { data: withoutDates(rows, p), total, quoted: null, capped: false };
    }

    // Prices can drop, filter and reorder LiteAPI hotels, so the page takes the SQL cap of 100 candidates and
    // paginates them here
    const found = await search(request, candidates);
    const rows = rowsOf(found);
    const complete = Number(found.results.total ?? 0) <= rows.length;
    if (complete) {
        return paged(p.dates ? await priceSearchResults(rows, p) : withoutDates(rows, p));
    }
    if (p.dates && rows.some((row) => row.liteapi_id)) {
        return paged(await priceSearchResults(rows, p), true);
    }
    // Past 100 matches, without dates or with no LiteAPI hotel in the first 100, SQL pages every match. With dates,
    // pricing the page still filters any LiteAPI hotel further down, which the SQL let past the price range. Without
    // dates the SQL ranged and ordered LiteAPI hotels by their stored price, so the page can only hide that price.
    const sql = await search(request, { page, pageSize: PAGE_SIZE });
    const sqlPage = rowsOf(sql);
    return {
        data: p.dates ? await priceSearchResults(sqlPage, p) : withoutDates(sqlPage, { sort: p.sort }),
        total: Number(sql.results.total ?? 0),
        quoted: null,
        capped: false,
    };
}

// The place list only brings back LiteAPI's own hotels, so owner listings past the row limit are read here. 1,000 rows
// is far more than a city has, and keeps a wildcard destination ("%") from reading every hotel.
async function ownersPastLimit(request: SearchRequest, ids: string[], first: HotelSearchResult[], matches: number) {
    const pages: Promise<SearchResponse>[] = [];
    for (let page = 2; page <= 10 && (page - 1) * LIVE_CANDIDATES < matches; page++) {
        pages.push(search(request, { page, pageSize: LIVE_CANDIDATES }, ids));
    }
    // A hotel saved between the calls shifts the pages, which would show a listing twice
    const seen = new Set(first.map((row) => row.id));
    const owners: HotelSearchResult[] = [];
    for (const row of (await Promise.all(pages)).flatMap(rowsOf)) {
        if (!row.liteapi_id && !seen.has(row.id)) {
            seen.add(row.id);
            owners.push(row);
        }
    }
    return owners;
}
