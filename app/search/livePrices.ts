import { partyOf } from '../../lib/liteapi/party.ts';
import { getFromPrices } from '../../lib/liteapi/rates.ts';
import type { Live, Quote } from '../../lib/liteapi/rates.ts';
import type { HotelSearchResult } from './components/SearchResultCard';
import type { PropertyFilter } from './types.ts';

export async function priceSearchResults(rows: HotelSearchResult[], p: PropertyFilter): Promise<HotelSearchResult[]> {
    const ids = [...new Set(rows.flatMap(row => row.liteapi_id ? [row.liteapi_id] : []))];
    if (!p.dates || ids.length === 0) {
        return rows;
    }

    // A pricing bug must not turn into a failed search: treat it like LiteAPI being down.
    // Adults default to 2 like the stay page, so a result's price is the one its stay page quotes.
    const live = await getFromPrices(ids, {
        checkIn: p.dates.checkIn,
        checkOut: p.dates.checkOut,
        ...partyOf(p.guests?.adults || 2, p.guests?.children ?? 0),
    }).catch((error: unknown): Map<string, Live<Quote>> => {
        console.warn('[search] live prices failed', error);
        return new Map();
    });

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
        const price = Number(next.min_price);
        if ((min !== undefined && !(price >= min)) || (max !== undefined && !(price <= max))) {
            continue;
        }
        priced.push(next);
    }

    if (p.sort === 'price-low' || p.sort === 'price-high') {
        const direction = p.sort === 'price-low' ? 1 : -1;
        priced.sort((a, b) => direction * (Number(a.min_price) - Number(b.min_price)));
    }
    return priced;
}
