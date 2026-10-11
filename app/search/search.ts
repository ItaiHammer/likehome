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

// Paging stays out of SearchRequest: it picks which slice of results to show,
// not which stays match, so the AI and filter parsing never see it.
export type PageOptions = {
    page?: number;
    pageSize?: number;
};

export async function search(searchParams: SearchRequest, pageOptions?: PageOptions): Promise<SearchResponse> {
    const standardizedParams = getSearchParams(searchParams);

    const result = await searchAvailableHotels({
        ...(pageOptions?.page !== undefined && { page: pageOptions.page }),
        ...(pageOptions?.pageSize !== undefined && { page_size: pageOptions.pageSize }),
        city: standardizedParams?.location?.city,
        region: standardizedParams?.location?.region,
        country: toStoredCountry(standardizedParams?.location?.country),
        check_in: standardizedParams?.dates?.checkIn,
        check_out: standardizedParams?.dates?.checkOut,
        guests: standardizedParams?.guests?.total,
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

// The hotels table stores the US as "USA", but the AI spells it out ("United States of America")
// and the destination picker says "United States", so those found nothing. Other countries are
// stored by their full name. Only the database call is translated; params keep what was asked.
const STORED_COUNTRY_NAMES: Record<string, string> = {
    'united states of america': 'USA',
    'united states': 'USA',
    'usa': 'USA',
    'us': 'USA',
    'u.s.': 'USA',
    'u.s.a.': 'USA',
};

function toStoredCountry(country?: string): string | undefined {
    if (country === undefined) {
        return undefined;
    }
    return STORED_COUNTRY_NAMES[country.toLowerCase()] ?? country;
}

function getSearchParams(searchParams: SearchRequest): PropertyFilter {
    if (searchParams === null || searchParams === undefined) {
        return {};
    }

    return Object.fromEntries(
        Object.entries({
            location: getLocationParams(searchParams.where),
            dates: getDatesParams(searchParams.checkIn, searchParams.checkOut),
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

function getDatesParams(checkIn?: string, checkOut?: string): DateParams | undefined {
    if (checkIn) {
        checkIn = checkIn.split('T')[0];
    }
    if (checkOut) {
        checkOut = checkOut.split('T')[0];
    }
    const validCheckIn = checkIn && !isNaN(new Date(checkIn).getTime());
    const validCheckOut = checkOut && !isNaN(new Date(checkOut).getTime());

    let checkInDate = new Date();
    let checkOutDate = new Date();

    // Both invalid, omit
    if (!validCheckIn && !validCheckOut) {
        return undefined;
    }

    // Defaults if one is omitted
    if (validCheckIn) {
        checkInDate = new Date(checkIn);
    }
    if (validCheckOut) {
        checkOutDate = new Date(checkOut);
    }
    if (validCheckIn && !validCheckOut) {
        checkOutDate = new Date(checkInDate);
        checkOutDate.setUTCDate(checkInDate.getUTCDate() + 1);
    }
    if (!validCheckIn && validCheckOut) {
        checkInDate = new Date(checkOutDate);
        checkInDate.setUTCDate(checkOutDate.getUTCDate() - 1);
    }

    const nowUTC = new Date(new Date().toISOString().split('T')[0]);

    // Enforce checkIn >= today
    if (checkInDate < nowUTC) {
        checkInDate = new Date(nowUTC);
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
    let adultGuests = getPositiveNumberOrUndefined(adults);
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
    const minStarRating = getPositiveNumberOrUndefined(min, 1);

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

function getPositiveNumberOrUndefined(value?: string, decimalDigits: number = 0): number | undefined {
    if (!isNaN(Number(value)) && value?.trim() != "") {
        return Math.max(+Number(value).toFixed(decimalDigits), 0);
    }
    return undefined;
}

function getAsTypeOrUndefined<T extends readonly string[]>(
    value: string | undefined,
    validValues: T
): T[number] | undefined {
    if (validValues.includes(value as any)) {
        return value as T[number];
    }
    return undefined;
}