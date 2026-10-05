import { COUNTRIES } from "@/lib/listing-display";
import {
  AMENITIES,
  PROPERTY_TYPES,
  type Amenity,
  type HotelInfo,
  type Listing,
  type ListingDraft,
  type ListingPhoto,
  type ListingRoom,
  type PropertyType,
} from "@/types/listing";

// Shared by the editor (instant feedback) and the server action (the check that actually protects the data).

export type HotelInfoErrors = Partial<Record<keyof HotelInfo, string>>;

// Form order, so "the first error" is the first one on screen.
export const HOTEL_INFO_FIELDS = [
  "name",
  "propertyType",
  "streetAddress",
  "city",
  "region",
  "postalCode",
  "country",
  "description",
] as const satisfies readonly (keyof HotelInfo)[];

export const MAX_LENGTH: Record<keyof HotelInfo, number> = {
  name: 100,
  propertyType: 40,
  streetAddress: 200,
  city: 100,
  region: 100,
  postalCode: 20,
  country: 2,
  description: 2000,
};

const asRecord = (input: unknown) => (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const ID = /^[\w-]{1,64}$/;

// Builds a HotelInfo from untrusted input (anything a browser could send), trimming every value.
export function readHotelInfo(input: unknown): HotelInfo {
  const source = asRecord(input);
  const text = (key: keyof HotelInfo) => asText(source[key]);
  return {
    name: text("name"),
    propertyType: text("propertyType") as PropertyType, // checked in validateHotelInfo
    streetAddress: text("streetAddress"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postalCode"),
    country: text("country"),
    description: text("description"),
  };
}

// Keeps only known amenities, once each, in AMENITIES order (so two lists with the same picks compare equal).
export function readAmenities(input: unknown): Amenity[] {
  const picked = Array.isArray(input) ? input : [];
  return AMENITIES.filter((amenity) => picked.includes(amenity));
}

// --- Rooms ---

// What the Edit room form holds: text exactly as typed.
export type RoomForm = Record<"roomType" | "bedConfiguration" | "maxGuests" | "roomCount" | "nightlyRate" | "description", string>;
export type RoomFormErrors = Partial<Record<keyof RoomForm, string>>;

// "189", "189.5" or "189.50" → 18950. Text, not float math, so no rounding surprises. null if it isn't an amount.
export function dollarsToCents(text: string): number | null {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function centsToDollarText(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function roomToForm(room?: ListingRoom): RoomForm {
  if (!room) return { roomType: "", bedConfiguration: "", maxGuests: "", roomCount: "", nightlyRate: "", description: "" };
  return {
    roomType: room.roomType,
    bedConfiguration: room.bedConfiguration,
    maxGuests: String(room.maxGuests),
    roomCount: String(room.roomCount),
    nightlyRate: centsToDollarText(room.nightlyRateCents),
    description: room.description,
  };
}

const wholeNumber = (text: string, min: number, max: number) => {
  if (!/^\d{1,6}$/.test(text.trim())) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
};

export function checkRoomForm(form: RoomForm): { errors: RoomFormErrors; room: Omit<ListingRoom, "id"> | null } {
  const errors: RoomFormErrors = {};
  const roomType = form.roomType.trim();
  const bedConfiguration = form.bedConfiguration.trim();
  const description = form.description.trim();
  const maxGuests = wholeNumber(form.maxGuests, 1, 20);
  const roomCount = wholeNumber(form.roomCount, 1, 500);
  const nightlyRateCents = dollarsToCents(form.nightlyRate);

  if (!roomType) errors.roomType = "Enter a room type";
  else if (roomType.length > 60) errors.roomType = "Keep this under 60 characters";
  if (!bedConfiguration) errors.bedConfiguration = "Describe the beds";
  else if (bedConfiguration.length > 60) errors.bedConfiguration = "Keep this under 60 characters";
  if (maxGuests === null) errors.maxGuests = "Enter a number from 1 to 20";
  if (roomCount === null) errors.roomCount = "Enter a number from 1 to 500";
  if (nightlyRateCents === null || nightlyRateCents < 100) errors.nightlyRate = "Enter a nightly rate of at least $1";
  if (description.length > 1000) errors.description = "Keep this under 1000 characters";

  if (Object.keys(errors).length > 0 || maxGuests === null || roomCount === null || nightlyRateCents === null) {
    return { errors, room: null };
  }
  return { errors, room: { roomType, bedConfiguration, maxGuests, roomCount, nightlyRateCents, description } };
}

// Server side: the same rules as the form, applied to saved rooms. null if anything is off.
export function readRooms(input: unknown): ListingRoom[] | null {
  if (!Array.isArray(input) || input.length > 50) return null;
  const rooms: ListingRoom[] = [];
  for (const item of input) {
    const r = asRecord(item);
    const whole = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? String(value) : "");
    if (typeof r.id !== "string" || !ID.test(r.id)) return null;
    const cents = r.nightlyRateCents;
    const { room } = checkRoomForm({
      roomType: asText(r.roomType),
      bedConfiguration: asText(r.bedConfiguration),
      maxGuests: whole(r.maxGuests),
      roomCount: whole(r.roomCount),
      nightlyRate: typeof cents === "number" && Number.isInteger(cents) && cents >= 0 ? centsToDollarText(cents) : "",
      description: asText(r.description),
    });
    if (!room) return null;
    rooms.push({ id: r.id, ...room });
  }
  return rooms;
}

// --- Photos ---

// Site files (/listings/...), mock uploads (blob:) or https URLs. Anything else, like javascript:, is refused.
const PHOTO_URL = /^(\/(?!\/)|blob:|https:\/\/)/;

export function readPhotos(input: unknown): ListingPhoto[] | null {
  if (!Array.isArray(input) || input.length > 30) return null;
  const photos: ListingPhoto[] = [];
  for (const item of input) {
    const p = asRecord(item);
    const caption = asText(p.caption);
    if (typeof p.id !== "string" || !ID.test(p.id)) return null;
    if (typeof p.url !== "string" || p.url.length > 2048 || !PHOTO_URL.test(p.url)) return null;
    if (caption.length > 80) return null;
    photos.push({ id: p.id, url: p.url, caption });
  }
  return photos;
}

// --- Whole draft ---

// Server side: everything the editor sends. null when rooms or photos are malformed (the UI never sends those).
export function readListingDraft(input: unknown): ListingDraft | null {
  const source = asRecord(input);
  const rooms = readRooms(source.rooms);
  const photos = readPhotos(source.photos);
  if (!rooms || !photos) return null;
  return { ...readHotelInfo(source), amenities: readAmenities(source.amenities), photos, rooms };
}

// A trusted Listing (from our own data layer) as the editor's draft.
export function draftFromListing(listing: Listing): ListingDraft {
  return { ...readHotelInfo(listing), amenities: listing.amenities, photos: listing.photos, rooms: listing.rooms };
}

export function validateHotelInfo(info: HotelInfo): HotelInfoErrors {
  const errors: HotelInfoErrors = {};
  const value = (field: keyof HotelInfo) => info[field].trim();

  if (!value("name")) errors.name = "Enter a property name";
  if (!PROPERTY_TYPES.includes(info.propertyType)) errors.propertyType = "Choose a property type";
  if (!value("streetAddress")) errors.streetAddress = "Enter a street address";
  if (!value("city")) errors.city = "Enter a city";
  if (value("postalCode") && !/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(value("postalCode"))) {
    errors.postalCode = "Use only letters, numbers, spaces and hyphens";
  }
  if (!COUNTRIES.some((c) => c.value === info.country)) errors.country = "Choose a country";

  for (const field of HOTEL_INFO_FIELDS) {
    if (value(field).length > MAX_LENGTH[field]) errors[field] ??= `Keep this under ${MAX_LENGTH[field]} characters`;
  }
  return errors;
}

export function firstErrorField(errors: HotelInfoErrors) {
  return HOTEL_INFO_FIELDS.find((field) => errors[field]);
}

// The line under the tab heading, e.g. "Enter a property name before saving."
export function errorSummary(errors: HotelInfoErrors) {
  const fields = HOTEL_INFO_FIELDS.filter((field) => errors[field]);
  if (fields.length === 1) return `${errors[fields[0]]} before saving.`;
  return `Fix the ${fields.length} highlighted fields before saving.`;
}
