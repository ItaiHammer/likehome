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

export async function search(searchParams: SearchRequest): Promise<SearchResponse> {
    const standardizedParams = getSearchParams(searchParams);

    const result = await searchAvailableHotels({
        city: standardizedParams?.location?.city,
        region: standardizedParams?.location?.region,
        country: standardizedParams?.location?.country,
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
    const { ymd: checkInYmd, time: checkInTime } = getDate(checkIn);
    const { ymd: checkOutYmd, time: checkOutTime } = getDate(checkOut);

    if (checkInYmd === undefined && checkOutYmd === undefined) {
        return undefined;
    }

    // Check valid range
    if (checkInTime !== undefined && checkOutTime !== undefined &&
        checkInTime >= checkOutTime) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries({
            checkIn: checkInYmd,
            checkOut: checkOutYmd
        }).filter(([_, value]) => value !== undefined)
    );
}

function getBedsParams(num?: string, size?: string): BedParams | undefined {
    const numBeds = getNumberOrUndefined(num);
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
    let adultGuests = getNumberOrUndefined(adults);
    const childGuests = getNumberOrUndefined(children);
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
    const minPrice = getNumberOrUndefined(min);
    const maxPrice = getNumberOrUndefined(max);
    
    if (minPrice === undefined && maxPrice === undefined) {
        return undefined;
    }

    // Check valid range, allow 1 value in range
    if (minPrice !== undefined && maxPrice !== undefined &&
        minPrice > maxPrice) {
        return undefined;
    }
    
    return Object.fromEntries(
        Object.entries({
            min: minPrice,
            max: maxPrice
        }).filter(([_, value]) => value !== undefined)
    );
}

function getRatingParams(min?: string): RatingParams | undefined {
    const minStarRating = getNumberOrUndefined(min);

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

function getDate(dateStr?: string): { ymd?: string, time?: number} {
    if (dateStr === undefined) {
        return {};
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return {};
    }

    return {
        ymd: date.toISOString().split('T')[0],
        time: date.getTime()
    };
}

function getNumberOrUndefined(value?: string): number | undefined {
    if (!isNaN(Number(value)) && value?.trim() != "") {
        return Number(value);
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