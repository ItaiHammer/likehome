import type { Amenity, Listing, PropertyType } from "@/types/listing";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  hotel: "Hotel",
  motel: "Motel",
  resort: "Resort",
  inn: "Inn",
  bed_and_breakfast: "Bed and breakfast",
  apartment: "Apartment",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  wifi: "Wi-Fi",
  parking: "Parking",
  restaurant: "Restaurant",
  pool: "Pool",
  fitness_center: "Fitness center",
  air_conditioning: "Air conditioning",
  step_free_entrance: "Step-free entrance",
  elevator: "Elevator",
  accessible_parking: "Accessible parking",
  family_rooms: "Family rooms",
};

// How the Amenities tab groups the checkboxes.
export const AMENITY_GROUPS: { title: string; description: string; amenities: Amenity[] }[] = [
  {
    title: "Property amenities",
    description: "Select all amenities available to guests.",
    amenities: ["wifi", "parking", "restaurant", "pool", "fitness_center", "air_conditioning"],
  },
  {
    title: "Accessibility and family",
    description: "Help guests choose a stay that suits their needs.",
    amenities: ["step_free_entrance", "elevator", "accessible_parking", "family_rooms"],
  },
];

// Short list until the team decides which countries LikeHome supports.
export const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "JP", label: "Japan" },
  { value: "AU", label: "Australia" },
];

export function countryLabel(code: string) {
  return COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

// "Monterey, California", or "Kyoto, Japan" when there's no region.
export function formatLocation(listing: Pick<Listing, "city" | "region" | "country">) {
  return [listing.city, listing.region || countryLabel(listing.country)].filter(Boolean).join(", ");
}

export function formatRoomCount(rooms: Listing["rooms"]) {
  const total = rooms.reduce((sum, room) => sum + room.roomCount, 0);
  if (total === 0) return "No rooms yet";
  return total === 1 ? "1 room" : `${total} rooms`;
}

// 18900 → "$189", 18950 → "$189.50"
export function formatPrice(cents: number) {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

// "Choose from 17 rooms across three room types."
export function formatRoomTypesSummary(rooms: Listing["rooms"]) {
  if (rooms.length === 0) return "No rooms listed yet.";
  const types = NUMBER_WORDS[rooms.length] ?? String(rooms.length);
  return `Choose from ${formatRoomCount(rooms)} across ${types} room ${rooms.length === 1 ? "type" : "types"}.`;
}

// Cheapest nightly rate across room types, or null with no rooms.
export function lowestRate(rooms: Listing["rooms"]) {
  return rooms.length > 0 ? Math.min(...rooms.map((room) => room.nightlyRateCents)) : null;
}

// What a listing still needs before guests can book it, with the editor tab that fixes it.
export function needsAttention(listing: Pick<Listing, "photos" | "rooms">) {
  const todo: { label: string; tab: "photos" | "rooms" }[] = [];
  if (listing.photos.length === 0) todo.push({ label: "Add photos", tab: "photos" });
  if (listing.rooms.length === 0) todo.push({ label: "Add rooms", tab: "rooms" });
  return todo;
}

// 1 → "1 photo", 4 → "4 photos"
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
