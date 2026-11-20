import type { Listing } from "@/types/listing";

// LOCAL DEV SAMPLE DATA ONLY — never saved to the database or sent to an API.
// The actual /listings page and ListingRow render these in sample mode.
export const mockListings: Listing[] = [
  {
    id: "mock-harbor-house",
    ownerId: "mock-preview-only",
    name: "Harbor House",
    propertyType: "hotel",
    streetAddress: "100 Coastal Way",
    city: "Monterey",
    region: "California",
    postalCode: "93940",
    country: "US",
    description: "A welcoming coastal hotel close to Monterey Bay, with bright rooms, ocean views, and peaceful shared spaces.",
    amenities: ["wifi", "parking", "restaurant", "pool", "fitness_center", "air_conditioning", "elevator", "family_rooms"],
    photos: [
      { id: "harbor-exterior", url: "/listings/samples/exterior.svg", caption: "Harbor House exterior" },
      { id: "harbor-lobby", url: "/listings/samples/lobby.svg", caption: "Lobby" },
      { id: "harbor-room", url: "/listings/samples/guest-room.svg", caption: "Coastal king room" },
      { id: "harbor-pool", url: "/listings/samples/pool.svg", caption: "Swimming pool" },
    ],
    rooms: [
      { id: "harbor-king", roomType: "Coastal King", bedConfiguration: "1 king bed", maxGuests: 2, roomCount: 8, nightlyRateCents: 18900, description: "Bright king room with a seating area." },
      { id: "harbor-queen", roomType: "Ocean Queen", bedConfiguration: "2 queen beds", maxGuests: 4, roomCount: 6, nightlyRateCents: 22900, description: "Spacious room for families and friends." },
      { id: "harbor-suite", roomType: "Balcony Suite", bedConfiguration: "1 king bed", maxGuests: 3, roomCount: 3, nightlyRateCents: 31900, description: "Private balcony overlooking the coast." },
    ],
  },
  {
    id: "mock-pacific-terrace",
    ownerId: "mock-preview-only",
    name: "Pacific Terrace",
    propertyType: "resort",
    streetAddress: "200 Ocean View Drive",
    city: "Santa Cruz",
    region: "California",
    postalCode: "95060",
    country: "US",
    description: "An airy coastal retreat with a sunny courtyard, a swimming pool, and spacious rooms near the beach.",
    amenities: ["wifi", "parking", "restaurant", "pool", "air_conditioning", "family_rooms"],
    photos: [
      { id: "terrace-exterior", url: "/listings/samples/ocean-balcony.svg", caption: "Ocean balcony" },
      { id: "terrace-courtyard", url: "/listings/samples/courtyard.svg", caption: "Courtyard" },
      { id: "terrace-restaurant", url: "/listings/samples/restaurant.svg", caption: "Dining area" },
    ],
    rooms: [
      { id: "terrace-queen", roomType: "Garden Queen", bedConfiguration: "2 queen beds", maxGuests: 4, roomCount: 9, nightlyRateCents: 21900, description: "Garden-facing family room." },
      { id: "terrace-suite", roomType: "Ocean View Suite", bedConfiguration: "1 king bed", maxGuests: 2, roomCount: 5, nightlyRateCents: 34900, description: "Spacious suite with ocean views." },
    ],
  },
  {
    id: "mock-pine-ridge-inn",
    ownerId: "mock-preview-only",
    name: "Pine Ridge Inn",
    propertyType: "inn",
    streetAddress: "350 Forest Trail",
    city: "South Lake Tahoe",
    region: "California",
    postalCode: "96150",
    country: "US",
    description: "A relaxed mountain inn surrounded by trees, scenic trails, and comfortable guest rooms.",
    amenities: ["wifi", "parking", "family_rooms"],
    photos: [
      { id: "ridge-exterior", url: "/listings/samples/mountain-inn.svg", caption: "Mountain inn exterior" },
      { id: "ridge-room", url: "/listings/samples/guest-room.svg", caption: "Cozy guest room" },
    ],
    rooms: [
      { id: "ridge-queen", roomType: "Mountain Queen", bedConfiguration: "1 queen bed", maxGuests: 2, roomCount: 7, nightlyRateCents: 15900, description: "Cozy mountain-facing room." },
    ],
  },
];
