import type { Listing } from "@/types/listing";

// Photos are sample illustrations from public/listings/samples/ until the real Figma photos are exported.

export const MOCK_OWNER_ID = "owner-1";

// Set to true to make every save fail, to see the "Changes weren't saved" / Retry state.
export const MOCK_SAVE_FAILS = false;

// Set to true to make every save throw, like a server crash or a dropped connection, to see the "couldn't reach" state.
export const MOCK_SAVE_THROWS = false;

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "harbor-house",
    ownerId: MOCK_OWNER_ID,
    name: "Harbor House",
    propertyType: "hotel",
    streetAddress: "214 Ocean Avenue",
    city: "Monterey",
    region: "California",
    postalCode: "93940",
    country: "US",
    description: "A relaxed coastal hotel near the waterfront, with bright rooms and a quiet courtyard.",
    amenities: [
      "wifi",
      "parking",
      "restaurant",
      "air_conditioning",
      "step_free_entrance",
      "elevator",
      "accessible_parking",
      "family_rooms",
    ],
    photos: [
      { id: "hh-1", url: "/listings/samples/exterior.svg", caption: "Exterior" },
      { id: "hh-2", url: "/listings/samples/guest-room.svg", caption: "Guest room" },
      { id: "hh-3", url: "/listings/samples/courtyard.svg", caption: "Courtyard" },
      { id: "hh-4", url: "/listings/samples/ocean-balcony.svg", caption: "Ocean balcony" },
    ],
    rooms: [
      {
        id: "hh-r1",
        roomType: "Coastal king",
        bedConfiguration: "1 king bed",
        maxGuests: 2,
        roomCount: 8,
        nightlyRateCents: 18900,
        description: "A bright room with a king bed and coastal views.",
      },
      {
        id: "hh-r2",
        roomType: "Courtyard queen",
        bedConfiguration: "2 queen beds",
        maxGuests: 4,
        roomCount: 6,
        nightlyRateCents: 21900,
        description: "Two queen beds overlooking the courtyard garden.",
      },
      {
        id: "hh-r3",
        roomType: "Ocean suite",
        bedConfiguration: "King + sofa bed",
        maxGuests: 3,
        roomCount: 3,
        nightlyRateCents: 28900,
        description: "A suite with a private balcony facing the bay.",
      },
    ],
  },
  {
    id: "pine-hollow-inn",
    ownerId: MOCK_OWNER_ID,
    name: "Pine Hollow Inn",
    propertyType: "inn",
    streetAddress: "88 Ridge Road",
    city: "Asheville",
    region: "North Carolina",
    postalCode: "28801",
    country: "US",
    description: "A small mountain inn with a wraparound porch and wood-burning fireplaces.",
    amenities: ["wifi", "parking"],
    photos: [
      { id: "ph-1", url: "/listings/samples/mountain-inn.svg", caption: "Mountain inn" },
      { id: "ph-2", url: "/listings/samples/lobby.svg", caption: "Lobby" },
    ],
    rooms: [
      {
        id: "ph-r1",
        roomType: "Porch queen",
        bedConfiguration: "1 queen bed",
        maxGuests: 2,
        roomCount: 5,
        nightlyRateCents: 14500,
        description: "A cozy room that opens onto the porch.",
      },
    ],
  },
  // Owned by someone else: /listings/desert-bloom/edit should show "not found".
  {
    id: "desert-bloom",
    ownerId: "owner-2",
    name: "Desert Bloom Motel",
    propertyType: "motel",
    streetAddress: "1200 Palm Canyon Drive",
    city: "Palm Springs",
    region: "California",
    postalCode: "92262",
    country: "US",
    description: "A mid-century motel with a pool and mountain views.",
    amenities: ["wifi", "parking", "pool"],
    photos: [{ id: "db-1", url: "/listings/samples/pool.svg", caption: "Pool" }],
    rooms: [],
  },
];
