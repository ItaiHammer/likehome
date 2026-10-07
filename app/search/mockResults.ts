import type { SceneVariant } from "../_components/WindowScene";
import type { HotelSearchResult } from "./components/SearchResultCard";

export type MockHotelSearchResult = HotelSearchResult & {
  mock_variant: SceneVariant;
  tags: string[];
  num_beds: number;
  bed_size: string;
};

type MockSearchParams = {
  where?: string;
  adults?: string;
  children?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  numBeds?: string;
  bedSize?: string;
  tags: string[];
  sort?: "recommended" | "price-low" | "price-high";
  page?: string;
};

const PAGE_SIZE = 21;

const NAMES = [
  "Azure Cove Retreat",
  "Palm House",
  "The Garden Terrace",
  "Harborlight Hotel",
  "Solstice Suites",
  "Casa Marisol",
  "Juniper House",
  "Bluebird Lodge",
  "The Willow",
  "Driftwood Residence",
  "Golden Hour Inn",
  "The Glasshouse",
];

const DEFAULT_LOCATIONS = [
  ["San Diego", "California", "United States"],
  ["Miami", "Florida", "United States"],
  ["Honolulu", "Hawaii", "United States"],
  ["Lisbon", "Lisbon", "Portugal"],
  ["Barcelona", "Catalonia", "Spain"],
  ["Positano", "Campania", "Italy"],
  ["Banff", "Alberta", "Canada"],
  ["Tulum", "Quintana Roo", "Mexico"],
] as const;

const TAG_SETS = [
  ["Pool", "Free Meals", "Free Wi-Fi", "Couples"],
  ["Parking", "Kitchen", "Families", "Kids"],
  ["Gym", "Pool", "Housekeeping", "Friends"],
  ["Free Wi-Fi", "Pets", "Kitchen", "Gift Shops"],
  ["ADA Compliant", "Free Wi-Fi", "Housekeeping", "Couples"],
  ["EV Charging", "Parking", "Gym", "Families"],
  ["Pool", "Free Meals", "Kids", "Families"],
  ["Washer & Dryer", "Kitchen", "Pets", "Friends"],
];

const BED_SIZES = ["Queen", "King", "Double", "Twin", "Twin XL"];
const VARIANTS: SceneVariant[] = ["sea", "mountain", "desert", "city"];

export function getMockSearchResults(params: MockSearchParams) {
  const requestedLocation = parseRequestedLocation(params.where);

  let results: MockHotelSearchResult[] = Array.from({ length: 48 }, (_, index) => {
    const location = requestedLocation ?? DEFAULT_LOCATIONS[index % DEFAULT_LOCATIONS.length];
    const price = 92 + ((index * 37) % 285);
    const rating = 3.6 + ((index * 17) % 14) / 10;
    const beds = 1 + (index % 4);
    const bedSize = BED_SIZES[index % BED_SIZES.length];
    const tags = TAG_SETS[index % TAG_SETS.length];
    const rooms = 1 + ((index * 3) % 7);
    const capacity = Math.max(2, beds * 2 + (index % 2));

    return {
      id: `mock-${index + 1}`,
      name: `${NAMES[index % NAMES.length]}${index >= NAMES.length ? ` ${Math.floor(index / NAMES.length) + 1}` : ""}`,
      description:
        index % 3 === 0
          ? "A bright, easygoing stay with thoughtful spaces for relaxing between adventures."
          : index % 3 === 1
            ? "Comfortable rooms, inviting shared spaces, and the essentials for a low-stress getaway."
            : "A polished home base with warm details and convenient amenities close at hand.",
      city: location[0],
      region: location[1],
      country: location[2],
      min_price: price,
      max_capacity: capacity,
      available_rooms: rooms,
      rating: Number(Math.min(5, rating).toFixed(1)),
      mock_variant: VARIANTS[index % VARIANTS.length],
      tags: [...tags],
      num_beds: beds,
      bed_size: bedSize,
      photo_urls: null,
    };
  });

  const minPrice = numberOrUndefined(params.minPrice);
  const maxPrice = numberOrUndefined(params.maxPrice);
  const minRating = numberOrUndefined(params.minRating);
  const minBeds = numberOrUndefined(params.numBeds);
  const guestCount = positiveInt(params.adults, 2) + nonNegativeInt(params.children, 0);

  results = results.filter((stay) => {
    const price = Number(stay.min_price ?? 0);
    const rating = Number(stay.rating ?? 0);

    if (guestCount > Number(stay.max_capacity ?? 0)) return false;
    if (minPrice !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;
    if (minRating !== undefined && rating < minRating) return false;
    if (minBeds !== undefined && stay.num_beds < minBeds) return false;
    if (params.bedSize && stay.bed_size !== params.bedSize) return false;
    if (params.tags.length && !params.tags.every((tag) => stay.tags.includes(tag))) return false;
    return true;
  });

  if (params.sort === "price-low") {
    results.sort((a, b) => Number(a.min_price) - Number(b.min_price));
  } else if (params.sort === "price-high") {
    results.sort((a, b) => Number(b.min_price) - Number(a.min_price));
  }

  const total = results.length;
  const page = positiveInt(params.page, 1);
  const start = (page - 1) * PAGE_SIZE;

  return {
    data: results.slice(start, start + PAGE_SIZE),
    total,
  };
}

function parseRequestedLocation(where?: string): [string, string | null, string | null] | null {
  const value = where?.trim();
  if (!value) return null;

  const pieces = value.split(",").map((piece) => piece.trim()).filter(Boolean);
  if (pieces.length === 1) return [pieces[0], "", ""];
  if (pieces.length === 2) return [pieces[0], "", pieces[1]];
  return [pieces[0], pieces.slice(1, -1).join(", "), pieces.at(-1) ?? ""];
}

function numberOrUndefined(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
