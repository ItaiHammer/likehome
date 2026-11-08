import type { 
    SearchRequest,
    SearchResponse,
    PropertyFilter,
    LocationParams,
    DateParams,
    BedParams,
    GuestParams,
    PriceParams,
    RatingParams,
    Sort,
    Tag
} from './types.ts';
import { bedSizes, sorts, tags } from './types.ts';

import { searchAvailableHotels } from '../../utils/search.ts';
import { parseDate, todayInTimeZone } from '../../utils/reservation-logic.ts';
import { stateName, stateNamed } from '../../lib/us-states.ts';

// Paging stays out of SearchRequest: it picks which slice of results to show,
// not which stays match, so the AI and filter parsing never see it.
export type PageOptions = {
    page?: number;
    pageSize?: number;
};

// liteapiIds: the hotels LiteAPI lists for the searched place, matched whatever city they're saved under
export async function search(searchParams: SearchRequest, pageOptions?: PageOptions, liteapiIds?: string[]): Promise<SearchResponse> {
    const standardizedParams = getSearchParams(searchParams);
    const location = toStoredLocation(standardizedParams?.location);

    const result = await searchAvailableHotels({
        ...(pageOptions?.page !== undefined && { page: pageOptions.page }),
        ...(pageOptions?.pageSize !== undefined && { page_size: pageOptions.pageSize }),
        ...(liteapiIds?.length && { liteapi_ids: liteapiIds }),
        city: location.city,
        region: location.region,
        country: location.country,
        check_in: standardizedParams?.dates?.checkIn,
        check_out: standardizedParams?.dates?.checkOut,
        guests: standardizedParams?.guests?.total,
        adults: standardizedParams?.guests?.adults,
        children: standardizedParams?.guests?.children,
        min_price: standardizedParams?.price?.min,
        max_price: standardizedParams?.price?.max,
        min_rating: standardizedParams?.rating?.minStars,
        num_beds: standardizedParams?.beds?.num,
        bed_size: standardizedParams?.beds?.size,
        tags: standardizedParams?.tags,
        sort: standardizedParams?.sort
    });

    return {
        params: standardizedParams,
        results: result
    };
}

// The hotels table spells places its own way, so only the database call is translated; params keep what was asked.
function toStoredLocation(location?: LocationParams): Partial<LocationParams> {
    if (!location) {
        return {};
    }
    // "Paris, Texas": a US state where the country goes
    const state = location.region === undefined ? stateNamed(location.country) : null;
    const country = state ? 'USA' : toStoredCountry(location.country);
    return {
        city: toStoredCity(location.city),
        region: state ?? toStoredRegion(location.region, country),
        country,
    };
}

// The import stores these under the destination picker's spelling (TARGETS in scripts/import-liteapi.mts)
const STORED_CITY_NAMES: Record<string, string> = {
    'ubud': 'Bali',
    'luzern': 'Lucerne',
    'south lake tahoe': 'Lake Tahoe',
    'cancun': 'Cancún',
    'reykjavik': 'Reykjavík',
};

function toStoredCity(city?: string): string | undefined {
    if (city === undefined) {
        return undefined;
    }
    const folded = city.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    return STORED_CITY_NAMES[folded] ?? city;
}

// The hotels table stores the US as "USA", but the AI spells it out ("United States of America")
// and the destination picker says "United States", so those found nothing. LiteAPI hotels outside
// the US are stored by the English name Intl.DisplayNames gives ("United Kingdom", "Türkiye"),
// which people, place lists and the picker often spell differently.
const STORED_COUNTRY_NAMES: Record<string, string> = {
    'united states of america': 'USA',
    'united states': 'USA',
    'usa': 'USA',
    'us': 'USA',
    'u.s.': 'USA',
    'u.s.a.': 'USA',
    'uk': 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom',
    'britain': 'United Kingdom',
    'england': 'United Kingdom',
    'scotland': 'United Kingdom',
    'wales': 'United Kingdom',
    'northern ireland': 'United Kingdom',
    'united kingdom of great britain and northern ireland': 'United Kingdom',
    'uae': 'United Arab Emirates',
    'u.a.e.': 'United Arab Emirates',
    'turkey': 'Türkiye',
    'czech republic': 'Czechia',
    'the netherlands': 'Netherlands',
    'holland': 'Netherlands',
    'korea': 'South Korea',
    'republic of korea': 'South Korea',
    'hong kong sar': 'Hong Kong SAR China',
    'macao sar': 'Macao SAR China',
    'bosnia and herzegovina': 'Bosnia & Herzegovina',
    'saint lucia': 'St. Lucia',
    'turks and caicos islands': 'Turks & Caicos Islands',
};

function toStoredCountry(country?: string): string | undefined {
    if (country === undefined) {
        return undefined;
    }
    return STORED_COUNTRY_NAMES[country.toLowerCase()] ?? country;
}

// Only US hotels are stored with a region, the full state name. Elsewhere the middle of
// "Rome, Metropolitan City of Rome Capital, Italy" would rule out every hotel.
function toStoredRegion(region: string | undefined, storedCountry: string | undefined): string | undefined {
    if (region === undefined || storedCountry !== 'USA') {
        return undefined;
    }
    return stateName(region) ?? region;
}

function getSearchParams(searchParams: SearchRequest): PropertyFilter {
    if (searchParams === null || searchParams === undefined) {
        return {};
    }

    return Object.fromEntries(
        Object.entries({
            location: getLocationParams(searchParams.where),
            dates: getDatesParams(searchParams.checkIn, searchParams.checkOut, searchParams.tz),
            beds: getBedsParams(searchParams.numBeds, searchParams.bedSize),
            guests: getGuestsParams(searchParams.adults, searchParams.children),
            price: getPriceParams(searchParams.minPrice, searchParams.maxPrice),
            rating: getRatingParams(searchParams.minRating),
            sort: getSortParams(searchParams.sort),
            tags: getTagParams(searchParams.tags)
        }).filter(([_, value]) => value !== undefined)
    );
}

function getLocationParams(location?: string): LocationParams | undefined {
    if (location === undefined || !location.trim()) {
        return undefined;
    }

    const segment: string[] = location.split(',').map(s => s.trim());
    switch (segment.length) {
        case 0:
            return undefined;
        case 1:
            return { city: segment[0] };
        case 2:
            return {
                city: segment[0],
                country: segment[1]
            };
        case 3:
            return {
                city: segment[0],
                region: segment[1],
                country: segment[2]
            };
        default:
            // > 3 params
            // treat first as city, last as country, and
            // middle as ambiguous regions to skip
            return {
                city: segment[0],
                country: segment[segment.length - 1]
            };
    }
}

function getDatesParams(checkIn?: string, checkOut?: string, tz?: string): DateParams | undefined {
    const cleanedCheckIn = checkIn ? checkIn.split('T')[0] : undefined;
    const cleanedCheckOut = checkOut ? checkOut.split('T')[0] : undefined;
    
    // parseDate only accepts real YYYY-MM-DD dates, so 2027-02-30 is invalid
    // instead of rolling over to March 2
    const validCheckIn = parseDate(cleanedCheckIn) !== null;
    const validCheckOut = parseDate(cleanedCheckOut) !== null;

    let checkInDate = new Date();
    let checkOutDate = new Date();

    // Both invalid, omit
    if (!validCheckIn && !validCheckOut) {
        return undefined;
    }

    // Defaults if one is omitted
    if (validCheckIn) {
        checkInDate = new Date(cleanedCheckIn as string);
    }
    if (validCheckOut) {
        checkOutDate = new Date(cleanedCheckOut as string);
    }
    if (validCheckIn && !validCheckOut) {
        checkOutDate = new Date(checkInDate);
        checkOutDate.setUTCDate(checkInDate.getUTCDate() + 1);
    }
    if (!validCheckIn && validCheckOut) {
        checkInDate = new Date(checkOutDate);
        checkInDate.setUTCDate(checkOutDate.getUTCDate() - 1);
    }

    // "Today" in the guest's calendar (tz comes from the search form), not UTC's:
    // at 6pm Pacific it's already tomorrow in UTC
    const today = new Date(todayInTimeZone(tz));

    // Enforce checkIn >= today
    if (checkInDate < today) {
        checkInDate = new Date(today);
    }

    // Enforce checkOut > checkIn
    if (checkOutDate <= checkInDate) {
        checkOutDate = new Date(checkInDate);
        checkOutDate.setUTCDate(checkInDate.getUTCDate() + 1);
    }

    return {
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0]
    };
}

function getBedsParams(num?: string, size?: string): BedParams | undefined {
    const numBeds = getPositiveNumberOrUndefined(num);
    const bedSize = getAsTypeOrUndefined(size, bedSizes);
    
    if (numBeds === undefined && bedSize === undefined) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries({
            num: numBeds,
            size: bedSize
        }).filter(([_, value]) => value !== undefined)
    ); 
}

function getGuestsParams(adults?: string, children?: string): GuestParams | undefined {
    const adultGuests = getPositiveNumberOrUndefined(adults);
    const childGuests = getPositiveNumberOrUndefined(children);
    let total = 0;

    if (adultGuests === undefined && childGuests === undefined) {
        return undefined;
    }

    if (adultGuests !== undefined) {
        total += adultGuests;
    }

    if (childGuests !== undefined) {
        total += childGuests;
    }
    
    return Object.fromEntries(
        Object.entries({
            adults: adultGuests,
            children: childGuests,
            total: total
        }).filter(([_, value]) => value !== undefined)
    );
}

function getPriceParams(min?: string, max?: string): PriceParams | undefined {
    let minPrice = getPositiveNumberOrUndefined(min, 2);
    let maxPrice = getPositiveNumberOrUndefined(max, 2);
    
    if (minPrice === undefined && maxPrice === undefined) {
        return undefined;
    }

    // Enforce valid range, allow 1 value in range
    if (minPrice !== undefined && maxPrice !== undefined &&
        minPrice > maxPrice) {
        [minPrice, maxPrice] = [maxPrice, minPrice]         
    }
    
    return Object.fromEntries(
        Object.entries({
            min: minPrice,
            max: maxPrice
        }).filter(([_, value]) => value !== undefined)
    );
}

function getRatingParams(min?: string): RatingParams | undefined {
    const rating = getPositiveNumberOrUndefined(min, 1);
    // Ratings are out of 5
    const minStarRating = rating === undefined ? undefined : Math.min(rating, 5);

    if (minStarRating === undefined) {
        return undefined;
    }
    return {
        minStars: minStarRating
    };
}

function getSortParams(sort?: string): Sort | undefined {
    return getAsTypeOrUndefined(sort, sorts);
}

function getTagParams(tagInput?: SearchRequest['tags']): Tag[] | undefined {
    if (tagInput === undefined) {
        return undefined;
    }
    if (typeof tagInput === 'string') {
        tagInput = [tagInput];
    }
    const result: Tag[] = [];
    let tag;
    for (const t of tagInput) {
        tag = getAsTypeOrUndefined(t, tags);
        if (tag !== undefined) {
            result.push(tag);
        }
    }

    if (result.length > 0) {
        return result;
    }
    return undefined;
}

// Helpers

// Plain decimal numbers only: rejects hex ("0x10"), exponents ("1e3") and "Infinity",
// which Number() would otherwise accept
const PLAIN_NUMBER_RE = /^-?\d+(\.\d+)?$/;

function getPositiveNumberOrUndefined(value?: string, decimalDigits: number = 0): number | undefined {
    if (value !== undefined && PLAIN_NUMBER_RE.test(value.trim())) {
        return Math.max(+Number(value).toFixed(decimalDigits), 0);
    }
    return undefined;
}

function getAsTypeOrUndefined<T extends readonly string[]>(
    value: string | undefined,
    validValues: T
): T[number] | undefined {
    if ((validValues as readonly string[]).includes(value as string)) {
        return value as T[number];
    }
    return undefined;
}