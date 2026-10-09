// A property a hotel owner lists on LikeHome, as the listing editor sees it.

export const PROPERTY_TYPES = ["hotel", "motel", "resort", "inn", "bed_and_breakfast", "apartment"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const AMENITIES = [
  "wifi",
  "parking",
  "restaurant",
  "pool",
  "fitness_center",
  "air_conditioning",
  "step_free_entrance",
  "elevator",
  "accessible_parking",
  "family_rooms",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export type ListingPhoto = {
  id: string;
  url: string;
  caption: string; // "Exterior", "Guest room"
};

export type ListingRoom = {
  id: string;
  roomType: string; // "Coastal king"
  bedConfiguration: string; // "1 king bed"
  maxGuests: number;
  roomCount: number; // how many rooms of this type the property has
  nightlyRateCents: number; // $189.00 → 18900
  description: string;
};

export type Listing = {
  id: string;
  ownerId: string;
  name: string;
  propertyType: PropertyType;
  streetAddress: string;
  city: string;
  region: string; // "" when the place has no state or region
  postalCode: string;
  country: string; // ISO code, e.g. "US"
  description: string;
  amenities: Amenity[]; // kept in AMENITIES order
  photos: ListingPhoto[]; // photos[0] is the cover
  rooms: ListingRoom[];
};

// The fields on the Hotel information tab.
export type HotelInfo = Pick<
  Listing,
  "name" | "propertyType" | "streetAddress" | "city" | "region" | "postalCode" | "country" | "description"
>;

// Everything the editor lets the owner change, saved together by "Save changes".
export type ListingDraft = Omit<Listing, "id" | "ownerId">;
