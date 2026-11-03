import { partyOf } from '../../lib/liteapi/party.ts';
import { getFromPrices } from '../../lib/liteapi/rates.ts';
import type { Live, Quote } from '../../lib/liteapi/rates.ts';
import type { HotelSearchResult } from './components/SearchResultCard';
import type { PropertyFilter } from './types.ts';

const priceOf = (row: HotelSearchResult) => (row.min_price == null || row.min_price === '' ? null : Number(row.min_price));

// Stays without a price go last
export function sortByPrice(rows: HotelSearchResult[], sort: PropertyFilter['sort']): HotelSearchResult[] {
    if (sort !== 'price-low' && sort !== 'price-high') {
        return rows;
    }
    const direction = sort === 'price-low' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const x = priceOf(a);
        const y = priceOf(b);
        if (x === null || y === null) {
            return Number(x === null) - Number(y === null);
        }
        return direction * (x - y);
    });
}

async function liveQuotes(rows: HotelSearchResult[], p: PropertyFilter): Promise<Map<string, Live<Quote>>> {
    const ids = [...new Set(rows.flatMap(row => row.liteapi_id ? [row.liteapi_id] : []))];
    if (!p.dates || ids.length === 0) {
        return new Map();
    }
    // A pricing bug must not turn into a failed search: treat it like LiteAPI being down.
    // Adults default to 2 like the stay page, so a result's price is the one its stay page quotes.
    return getFromPrices(ids, {
        checkIn: p.dates.checkIn,
        checkOut: p.dates.checkOut,
        ...partyOf(p.guests?.adults || 2, p.guests?.children ?? 0),
    }).catch((error: unknown): Map<string, Live<Quote>> => {
        console.warn('[search] live prices failed', error);
        return new Map();
    });
}

export async function priceSearchResults(rows: HotelSearchResult[], p: PropertyFilter): Promise<HotelSearchResult[]> {
    if (!p.dates || !rows.some(row => row.liteapi_id)) {
        return rows;
    }
    const live = await liveQuotes(rows, p);

    const min = p.price?.min;
    const max = p.price?.max;
    const priced: HotelSearchResult[] = [];
    for (const row of rows) {
        if (!row.liteapi_id) {
            // Owner hotels were already price-filtered in SQL
            priced.push(row);
            continue;
        }
        const quote = live.get(row.liteapi_id);
        if (quote?.status === 'sold_out') {
            continue;
        }
        const next = quote?.status === 'live' ? { ...row, min_price: quote.value.perNight } : row;
        const price = priceOf(next);
        // A stay with no price can't be shown to fit a price range
        if ((min !== undefined && !(price !== null && price >= min)) || (max !== undefined && !(price !== null && price <= max))) {
            continue;
        }
        priced.push(price === null ? { ...next, price_status: 'unavailable' } : next);
    }
    return sortByPrice(priced, p.sort);
}

// One page in its own order: prices fill in, and a full hotel stays in place as sold out
export async function quotePage(rows: HotelSearchResult[], p: PropertyFilter): Promise<HotelSearchResult[]> {
    const live = await liveQuotes(rows, p);
    return rows.map((row): HotelSearchResult => {
        if (!row.liteapi_id) {
            return row;
        }
        const quote = live.get(row.liteapi_id);
        if (quote?.status === 'live') {
            return { ...row, min_price: quote.value.perNight, price_status: undefined };
        }
        if (quote?.status === 'sold_out') {
            return { ...row, price_status: 'sold-out' };
        }
        return { ...row, price_status: priceOf(row) === null ? 'unavailable' : undefined };
    });
}
