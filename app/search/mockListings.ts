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

    /*
     * Short selling points shown directly
     * on the listing card.
     */
    highlights: string[];

    maxGuests: number;
    beds: number;

    /*
     * Kept for compatibility with the earlier
     * frontend/backend listing shape.
     */
    kidFriendly: boolean;

    connectingRooms: boolean;
    goodFor: GoodFor[];

    /*
     * Backend/API can eventually provide one or
     * more listing photos here.
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

    /*
     * Backend/API can eventually provide the
     * destination photo here.
     */
    imageUrl?: string;
};

export const popularDestinations: PopularDestination[] = [
    // Nearby
    {
        name: "Monterey",
        searchValue: "Monterey",
        scope: "nearby",
    },
    {
        name: "Lake Tahoe",
        searchValue: "South Lake Tahoe",
        scope: "nearby",
    },
    {
        name: "Santa Cruz",
        searchValue: "Santa Cruz",
        scope: "nearby",
    },
    {
        name: "Big Sur",
        searchValue: "Big Sur",
        scope: "nearby",
    },
    {
        name: "Carmel",
        searchValue: "Carmel-by-the-Sea",
        scope: "nearby",
    },

    // National
    {
        name: "Santa Fe",
        searchValue: "Santa Fe",
        scope: "national",
    },
    {
        name: "Cape Cod",
        searchValue: "Cape Cod",
        scope: "national",
    },
    {
        name: "New York City",
        searchValue: "New York City",
        scope: "national",
    },
    {
        name: "Miami",
        searchValue: "Miami",
        scope: "national",
    },
    {
        name: "Seattle",
        searchValue: "Seattle",
        scope: "national",
    },

    // International
    {
        name: "Mallorca",
        searchValue: "Palma",
        scope: "international",
    },
    {
        name: "Amsterdam",
        searchValue: "Amsterdam",
        scope: "international",
    },
    {
        name: "Paris",
        searchValue: "Paris",
        scope: "international",
    },
    {
        name: "Tokyo",
        searchValue: "Tokyo",
        scope: "international",
    },
    {
        name: "Rome",
        searchValue: "Rome",
        scope: "international",
    },
];

export const mockListings: Listing[] = [
    {
        id: 1,
        name: "Harbor House",
        city: "Monterey",
        region: "California",
        country: "United States",
        pricePerNight: 180,
        rating: 4.8,
        propertyType: "Hotel",
        amenities: [
            "WiFi",
            "Free parking",
            "Ocean view",
            "Air conditioning",
        ],
        highlights: [
            "Ocean view",
            "Highly rated",
            "Free parking",
        ],
        maxGuests: 4,
        beds: 2,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families"],
    },
    {
        id: 2,
        name: "Cliffside Cabin",
        city: "Big Sur",
        region: "California",
        country: "United States",
        pricePerNight: 302,
        rating: 4.9,
        propertyType: "Cabin / Cottage",
        amenities: [
            "WiFi",
            "Full kitchen",
            "Free parking",
            "Mountain view",
            "Hot tub",
        ],
        highlights: [
            "Full kitchen",
            "Mountain view",
            "Highly rated",
        ],
        maxGuests: 4,
        beds: 2,
        kidFriendly: false,
        connectingRooms: false,
        goodFor: ["Couples"],
    },
    {
        id: 3,
        name: "Seaside Retreat",
        city: "Santa Cruz",
        region: "California",
        country: "United States",
        pricePerNight: 165,
        rating: 4.6,
        propertyType: "Motel",
        amenities: [
            "WiFi",
            "Pool",
            "Free breakfast",
            "Beach access",
            "Air conditioning",
        ],
        highlights: [
            "Free breakfast",
            "Beach access",
            "Pool",
        ],
        maxGuests: 5,
        beds: 2,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families", "Groups"],
    },
    {
        id: 4,
        name: "Lakeview Lodge",
        city: "South Lake Tahoe",
        region: "California",
        country: "United States",
        pricePerNight: 240,
        rating: 4.7,
        propertyType: "Resort",
        amenities: [
            "WiFi",
            "Pool",
            "Free parking",
            "Gym",
            "Hot tub",
            "Mountain view",
            "Casino",
        ],
        highlights: [
            "Mountain view",
            "Hot tub",
            "Casino",
        ],
        maxGuests: 6,
        beds: 3,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Families", "Groups"],
    },
    {
        id: 5,
        name: "The Courtyard Inn",
        city: "Santa Fe",
        region: "New Mexico",
        country: "United States",
        pricePerNight: 156,
        rating: 4.7,
        propertyType: "Bed & Breakfast",
        amenities: [
            "WiFi",
            "Free breakfast",
            "Free parking",
            "Air conditioning",
        ],
        highlights: [
            "Free breakfast",
            "Great value",
            "Free parking",
        ],
        maxGuests: 3,
        beds: 1,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families"],
    },
    {
        id: 6,
        name: "Lighthouse Loft",
        city: "Cape Cod",
        region: "Massachusetts",
        country: "United States",
        pricePerNight: 198,
        rating: 4.8,
        propertyType: "Apartment",
        amenities: [
            "WiFi",
            "Full kitchen",
            "Ocean view",
            "Washer / dryer",
            "Beach access",
        ],
        highlights: [
            "Ocean view",
            "Full kitchen",
            "Beach access",
        ],
        maxGuests: 2,
        beds: 1,
        kidFriendly: false,
        connectingRooms: false,
        goodFor: ["Couples"],
    },
    {
        id: 7,
        name: "Casa Maré",
        city: "Palma",
        country: "Spain",
        pricePerNight: 219,
        rating: 4.9,
        propertyType: "Villa",
        amenities: [
            "WiFi",
            "Pool",
            "Free breakfast",
            "Ocean view",
            "Beach access",
            "Spa",
            "Air conditioning",
        ],
        highlights: [
            "Ocean view",
            "Spa",
            "Highly rated",
        ],
        maxGuests: 5,
        beds: 2,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families", "Groups"],
    },
    {
        id: 8,
        name: "Canal House",
        city: "Amsterdam",
        country: "Netherlands",
        pricePerNight: 210,
        rating: 4.5,
        propertyType: "Condo",
        amenities: [
            "WiFi",
            "Full kitchen",
            "Washer / dryer",
            "City view",
        ],
        highlights: [
            "Full kitchen",
            "City view",
            "Washer / dryer",
        ],
        maxGuests: 3,
        beds: 2,
        kidFriendly: false,
        connectingRooms: false,
        goodFor: ["Couples"],
    },
    {
        id: 9,
        name: "Carmel Garden Inn",
        city: "Carmel-by-the-Sea",
        region: "California",
        country: "United States",
        pricePerNight: 205,
        rating: 4.8,
        propertyType: "Bed & Breakfast",
        amenities: [
            "WiFi",
            "Free breakfast",
            "Free parking",
            "Kitchenette",
            "Air conditioning",
        ],
        highlights: [
            "Free breakfast",
            "Highly rated",
            "Kitchenette",
        ],
        maxGuests: 4,
        beds: 2,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families"],
    },
    {
        id: 10,
        name: "Manhattan House",
        city: "New York City",
        region: "New York",
        country: "United States",
        pricePerNight: 285,
        rating: 4.6,
        propertyType: "Hotel",
        amenities: [
            "WiFi",
            "Gym",
            "Breakfast available",
            "Parking available",
            "City view",
            "Air conditioning",
        ],
        highlights: [
            "City view",
            "Central stay",
            "Fitness center",
        ],
        maxGuests: 4,
        beds: 2,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families", "Groups"],
    },
    {
        id: 11,
        name: "Palm Bay Resort",
        city: "Miami",
        region: "Florida",
        country: "United States",
        pricePerNight: 260,
        rating: 4.8,
        propertyType: "Resort",
        amenities: [
            "WiFi",
            "Pool",
            "Gym",
            "Ocean view",
            "Beach access",
            "Spa",
            "Free parking",
            "Air conditioning",
        ],
        highlights: [
            "Beach access",
            "Ocean view",
            "Spa",
        ],
        maxGuests: 6,
        beds: 3,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families", "Groups"],
    },
    {
        id: 12,
        name: "Pine & Sound",
        city: "Seattle",
        region: "Washington",
        country: "United States",
        pricePerNight: 190,
        rating: 4.7,
        propertyType: "Townhome",
        amenities: [
            "WiFi",
            "Full kitchen",
            "Free parking",
            "Washer / dryer",
            "City view",
            "EV charging",
        ],
        highlights: [
            "Full kitchen",
            "EV charging",
            "Free parking",
        ],
        maxGuests: 4,
        beds: 2,
        kidFriendly: true,
        connectingRooms: false,
        goodFor: ["Couples", "Families", "Groups"],
    },
    {
        id: 13,
        name: "Maison Lumière",
        city: "Paris",
        country: "France",
        pricePerNight: 275,
        rating: 4.9,
        propertyType: "Hotel",
        amenities: [
            "WiFi",
            "Breakfast available",
            "City view",
            "Air conditioning",
        ],
        highlights: [
            "City view",
            "Highly rated",
            "Boutique stay",
        ],
        maxGuests: 3,
        beds: 1,
        kidFriendly: false,
        connectingRooms: false,
        goodFor: ["Couples"],
    },
    {
        id: 14,
        name: "Sakura Stay",
        city: "Tokyo",
        country: "Japan",
        pricePerNight: 230,
        rating: 4.8,
        propertyType: "Hotel",
        amenities: [
            "WiFi",
            "Free breakfast",
            "Air conditioning",
            "Airport shuttle",
        ],
        highlights: [
            "Free breakfast",
            "Airport shuttle",
            "Highly rated",
        ],
        maxGuests: 4,
        beds: 2,
        kidFriendly: true,
        connectingRooms: true,
        goodFor: ["Couples", "Families"],
    },
    {
        id: 15,
        name: "Casa Roma",
        city: "Rome",
        country: "Italy",
        pricePerNight: 215,
        rating: 4.7,
        propertyType: "Vacation home",
        amenities: [
            "WiFi",
            "Full kitchen",
            "Washer / dryer",
            "Air conditioning",
            "City view",
        ],
        highlights: [
            "Full kitchen",
            "City view",
            "Washer / dryer",
        ],
        maxGuests: 3,
        beds: 2,
        kidFriendly: true,
        connectingRooms: false,
        goodFor: ["Couples", "Families"],
    },
];
