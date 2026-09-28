/**
 * Shared data shapes used by the Search / Filter / Sort frontend.
 *
 * TODO(INTEGRATION): Keep these types aligned with the shape returned by the
 * backend/API once the real listing endpoints are connected.
 */

export type PropertyType =
    | "Hotel"
    | "Resort"
    | "Motel"
    | "Bed & Breakfast"
    | "Apartment"
    | "Condo"
    | "Vacation home"
    | "Villa"
    | "Townhome"
    | "Cabin / Cottage";

export type GoodFor =
    | "Couples"
    | "Families"
    | "Groups";

export type Listing = {
    id: number;
    name: string;
    city: string;
    region?: string;
    country: string;

    pricePerNight: number;
    rating: number;

    propertyType: PropertyType;
    amenities: string[];

    /** Short selling points shown directly on a listing card. */
    highlights: string[];

    maxGuests: number;
    beds: number;

    /**
     * Kept for compatibility with the earlier frontend/backend listing shape.
     * TODO(DATABASE): Confirm whether this remains a dedicated field once the
     * final listing schema is defined.
     */
    kidFriendly: boolean;

    connectingRooms: boolean;
    goodFor: GoodFor[];

    /**
     * TODO(BACKEND): Populate with real listing photo URLs from the API.
     */
    imageUrls?: string[];
};

export type DestinationScope =
    | "nearby"
    | "national"
    | "international";

export type PopularDestination = {
    name: string;
    searchValue: string;
    scope: DestinationScope;

    /**
     * TODO(BACKEND): Populate with a representative destination image URL.
     */
    imageUrl?: string;
};
