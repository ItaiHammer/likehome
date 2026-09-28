import type { GoodFor, PropertyType } from "../types";

/**
 * Shared configuration for the Search / Filter / Sort frontend.
 *
 * TODO(INTEGRATION): Keep pagination, sorting, filter options, and supported
 * values aligned with the backend API once search requests are server-driven.
 *
 * TODO(DATABASE): Property types, amenities, and "Good for" values should
 * match the final listing/database schema.
 */

export const RESULTS_PER_PAGE = 21;
export const MAX_PRICE = 1000;
export const COLLAPSED_AMENITY_COUNT = 10;

export const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
] as const;

export type SortOption =
    | "recommended"
    | "price-low"
    | "price-high"
    | "rating";

export const SORT_OPTIONS: {
    value: SortOption;
    label: string;
}[] = [
    { value: "recommended", label: "Recommended" },
    { value: "price-low", label: "Price: Low to high" },
    { value: "price-high", label: "Price: High to low" },
    { value: "rating", label: "Highest rated" },
];

export const AMENITY_OPTIONS = [
    "WiFi",
    "Pool",
    "Hot tub",
    "Full kitchen",
    "Kitchenette",
    "Free breakfast",
    "Free parking",
    "Beach access",
    "Gym",
    "Spa",
    "Breakfast available",
    "Parking available",
    "Ocean view",
    "Mountain view",
    "City view",
    "Pet-friendly",
    "Air conditioning",
    "Washer / dryer",
    "Airport shuttle",
    "EV charging",
    "Casino",
] as const;

export const PROPERTY_TYPE_OPTIONS: PropertyType[] = [
    "Hotel",
    "Resort",
    "Motel",
    "Bed & Breakfast",
    "Apartment",
    "Condo",
    "Vacation home",
    "Villa",
    "Townhome",
    "Cabin / Cottage",
];

export const GOOD_FOR_OPTIONS: GoodFor[] = [
    "Couples",
    "Families",
    "Groups",
];

/**
 * Temporary fallbacks used when a popular destination does not have an image.
 *
 * TODO(API): Remove or keep only as a fallback once destination image URLs
 * are returned by the backend/API.
 */
export const DESTINATION_BACKGROUNDS = [
    "linear-gradient(140deg, #4F78C1 0%, #829FCE 48%, #AEC3DF 100%)",
    "linear-gradient(145deg, #829FCE 0%, #4C79BD 52%, #AEC3DF 100%)",
    "linear-gradient(130deg, #AEC3DF 0%, #739CD2 48%, #4F78C1 100%)",
    "linear-gradient(155deg, #4C79BD 0%, #AEC3DF 52%, #829FCE 100%)",
    "linear-gradient(125deg, #739CD2 0%, #4F78C1 52%, #AEC3DF 100%)",
] as const;

