// Frontend to Backend contract
export type SearchRequest = {
    where?: string;

    checkIn?: string;
    checkOut?: string;
    
    numBeds?: string;
    bedSize?: string;
    
    adults?: string;
    children?: string;
    
    minPrice?: string;
    maxPrice?: string;
    
    minRating?: string;
    
    sort?: string;

    tags?: string | string[];
}

// Backend to Frontend contract
export type SearchResponse = {
    params: PropertyFilter;
    results: PropertyRecords;
}

// Backend to Database contract
export type PropertyFilter = {
    location?: LocationParams;
    dates?: DateParams;
    beds?: BedParams;
    guests?: GuestParams;
    price?: PriceParams;
    rating?: RatingParams;
    sort?: Sort;
    tags?: Tag[];
}

// Database to Backend contract
export type PropertyRecords = {
    data: any, 
    error: any, 
    total: any
}

// Export intended only for use in /search/page.tsx
// Should not need to be used individually elsewhere
export type LocationParams = {
    city: string;
    region?: string;
    country?: string;
}

export type DateParams = {
    checkIn?: string;
    checkOut?: string;
}

export type BedParams = {
    num?: number;
    size?: BedSize;
}

export type GuestParams = {
    adults?: number;
    children?: number;
    total?: number;
}

export type PriceParams = {
    min?: number;
    max?: number;
}

export type RatingParams = {
    minStars: number;
}

// Values for specific options
export const bedSizes = [
    "Twin",
    "Twin XL",
    "Double",
    "Queen",
    "King",
] as const;
export type BedSize = typeof bedSizes[number];

export const sorts = [
    'recommended',
    'price-low',
    'price-high',
] as const;
export type Sort = typeof sorts[number];

export const propertyAmenities = [
    "Washer & Dryer",
    "Parking",
    "EV Charging",
    "Free Meals",
    "Pool",
    "Gym",
    "Gift Shops",
] as const;
export type ProperyAmenity = typeof propertyAmenities[number];

export const roomAmenities = [
    "ADA Compliant",
    "Kitchen",
    "Free Wi-Fi",
    "Housekeeping",
] as const;
export type RoomAmenity = typeof roomAmenities[number];

export const travelerTypes = [
    "Families",
    "Kids",
    "Pets",
    "Couples",
    "Friends",
] as const;
export type TravelerType = typeof travelerTypes[number];

export const tags = [
    ...propertyAmenities,
    ...roomAmenities,
    ...travelerTypes,
] as const;
export type Tag = typeof tags[number];