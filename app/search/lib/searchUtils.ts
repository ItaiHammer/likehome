import type { Listing, PopularDestination } from "../types";

/**
 * Handles intentionally related amenity values.
 *
 * For example, a stay with "Free breakfast" should also satisfy the broader
 * "Breakfast available" filter.
 *
 * TODO(DATABASE): Confirm that the final amenity schema uses consistent names
 * or IDs. This compatibility logic may no longer be needed once real listing
 * data is normalized.
 */
export function listingHasAmenity(
    stay: Listing,
    amenity: string,
): boolean {
    if (amenity === "Breakfast available") {
        return (
            stay.amenities.includes("Breakfast available") ||
            stay.amenities.includes("Free breakfast")
        );
    }

    if (amenity === "Parking available") {
        return (
            stay.amenities.includes("Parking available") ||
            stay.amenities.includes("Free parking")
        );
    }

    return stay.amenities.includes(amenity);
}

/**
 * Builds the current autocomplete list from mock listing and destination data.
 *
 * TODO(API): Replace this with backend-powered destination autocomplete once
 * the real search API is connected.
 */
export function buildDestinationSuggestions(
    listings: Listing[],
    destinations: PopularDestination[],
): string[] {
    return Array.from(
        new Set(
            [
                ...listings.flatMap((stay) => [
                    stay.city,
                    stay.region,
                    stay.country,
                ]),
                ...destinations.flatMap((place) => [
                    place.name,
                    place.searchValue,
                ]),
            ].filter(
                (value): value is string => Boolean(value),
            ),
        ),
    ).sort((a, b) => a.localeCompare(b));
}

/**
 * Temporary client-side destination matching used by mock listings.
 *
 * TODO(BACKEND): Real search should eventually send the destination to the
 * backend instead of filtering listing data in the browser.
 */
export function listingMatchesDestination(
    stay: Listing,
    destination: string,
): boolean {
    const normalized = destination.trim().toLowerCase();

    if (!normalized) {
        return true;
    }

    return (
        stay.city.toLowerCase().includes(normalized) ||
        (stay.region?.toLowerCase().includes(normalized) ?? false) ||
        stay.country.toLowerCase().includes(normalized)
    );
}

/**
 * Popular destination display names can differ from the actual searchable
 * city. Example: "Mallorca" maps to "Palma".
 *
 * TODO(API): Confirm whether destination aliases should eventually be resolved
 * by the frontend or by the backend/search service.
 */
export function resolveDestinationSearchValue(
    destination: string,
    destinations: PopularDestination[],
): string {
    const normalized = destination.trim().toLowerCase();

    const matchingDestination = destinations.find(
        (place) =>
            place.name.toLowerCase() === normalized ||
            place.searchValue.toLowerCase() === normalized,
    );

    return matchingDestination?.searchValue ?? destination;
}