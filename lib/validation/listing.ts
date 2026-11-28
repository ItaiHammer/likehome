import { travelerTypes } from "../../app/search/types.ts";
import {
  AMENITIES,
  PROPERTY_TYPES,
  type Amenity,
  type HotelInfo,
  type Listing,
  type ListingDraft,
  type ListingPhoto,
  type ListingRoom,
  ROOM_AMENITIES,
  type RoomAmenity,
  type PropertyType,
} from "../../types/listing.ts";

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
  country: 80,
  description: 2000,
};

// Same caps in the editor and on the server, so the UI never builds a draft the server will refuse.
export const MAX_ROOMS = 50;
export const MAX_PHOTOS = 30;

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

// Only known traveler categories can enter the saved hotel tags. Keep canonical spelling
// and stable order for editor dirty tracking, regardless of the browser's input.
export function readIdealFor(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const have = new Set(input.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase()));
  return travelerTypes.filter((category) => have.has(category.toLowerCase()));
}

// --- Rooms ---

// What the Edit room form holds: text exactly as typed.
export type RoomTextField = "roomType" | "bedConfiguration" | "maxGuests" | "roomCount" | "nightlyRate" | "description";
export type RoomForm = Record<RoomTextField, string> & { amenities: RoomAmenity[] };
export function readRoomAmenities(input: unknown): RoomAmenity[] {
  const picked = Array.isArray(input) ? input : [];
  return ROOM_AMENITIES.filter((a) => picked.includes(a));
}
export type RoomFormErrors = Partial<Record<RoomTextField, string>>;

// "189", "$189.5" or "1,189.50" → 118950. Text, not float math, so no rounding surprises. null if it isn't an amount.
export function dollarsToCents(text: string): number | null {
  const match = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  const dollars = match?.[1].replaceAll(",", "");
  if (!match || !dollars || dollars.length > 7) return null;
  return Number(dollars) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function centsToDollarText(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function roomToForm(room?: ListingRoom): RoomForm {
  if (!room) return { roomType: "", bedConfiguration: "", maxGuests: "2", roomCount: "", nightlyRate: "", description: "", amenities: [] };
  return {
    roomType: room.roomType,
    bedConfiguration: room.bedConfiguration,
    maxGuests: String(room.maxGuests),
    roomCount: String(room.roomCount),
    nightlyRate: centsToDollarText(room.nightlyRateCents),
    description: room.description,
    amenities: readRoomAmenities(room.amenities),
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
  // The database requires at least one bed; "0 queen beds" used to pass here and fail mid-save
  else if (/^\s*0+\s/.test(bedConfiguration)) errors.bedConfiguration = "A room needs at least 1 bed";
  if (maxGuests === null) errors.maxGuests = "Enter a number from 1 to 20";
  if (roomCount === null) errors.roomCount = "Enter a number from 1 to 500";
  if (nightlyRateCents === null || nightlyRateCents < 100) errors.nightlyRate = "Enter a nightly rate of at least $1";
  if (description.length > 1000) errors.description = "Keep this under 1000 characters";

  if (Object.keys(errors).length > 0 || maxGuests === null || roomCount === null || nightlyRateCents === null) {
    return { errors, room: null };
  }
  return { errors, room: { roomType, bedConfiguration, maxGuests, roomCount, nightlyRateCents, description, amenities: readRoomAmenities(form.amenities) } };
}

// Server side: the same rules as the form, applied to saved rooms. null if anything is off.
export function readRooms(input: unknown): ListingRoom[] | null {
  if (!Array.isArray(input) || input.length > MAX_ROOMS) return null;
  const rooms: ListingRoom[] = [];
  const usedIds = new Set<string>();
  for (const item of input) {
    const r = asRecord(item);
    const whole = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? String(value) : "");
    if (typeof r.id !== "string" || !ID.test(r.id) || usedIds.has(r.id)) return null;
    usedIds.add(r.id);
    const cents = r.nightlyRateCents;
    const { room } = checkRoomForm({
      roomType: asText(r.roomType),
      bedConfiguration: asText(r.bedConfiguration),
      maxGuests: whole(r.maxGuests),
      roomCount: whole(r.roomCount),
      nightlyRate: typeof cents === "number" && Number.isInteger(cents) && cents >= 0 ? centsToDollarText(cents) : "",
      description: asText(r.description),
      amenities: readRoomAmenities(r.amenities),
    });
    if (!room) return null;
    rooms.push({ id: r.id, ...room });
  }
  return rooms;
}

// --- Photos ---

// Site files (/listings/...) or https URLs (uploads are on Supabase Storage). Anything else, like
// javascript:, is refused. blob: URLs from the old mock upload only ever worked in one browser tab,
// so they're dropped instead of saved (audit F3), and a listing that still has one can be saved.
const PHOTO_URL = /^(\/(?!\/)|https:\/\/)/;

export function readPhotos(input: unknown): ListingPhoto[] | null {
  if (!Array.isArray(input) || input.length > MAX_PHOTOS) return null;
  const photos: ListingPhoto[] = [];
  const usedIds = new Set<string>();
  for (const item of input) {
    const p = asRecord(item);
    const caption = asText(p.caption);
    if (typeof p.id !== "string" || !ID.test(p.id) || usedIds.has(p.id)) return null;
    usedIds.add(p.id);
    if (typeof p.url === "string" && p.url.startsWith("blob:")) continue;
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
  return { ...readHotelInfo(source), amenities: readAmenities(source.amenities), idealFor: readIdealFor(source.idealFor), photos, rooms };
}

// A trusted Listing (from our own data layer) as the editor's draft.
export function draftFromListing(listing: Listing): ListingDraft {
  const info = readHotelInfo(listing);
  // Older listings expose an ISO code ("US") from storage. Show a readable
  // country name in the plain text input without rewriting what the owner types.
  if (/^[A-Za-z]{2}$/.test(info.country) && ISO_COUNTRY_CODES.has(info.country.toUpperCase())) {
    info.country = regionNames.of(info.country.toUpperCase()) ?? info.country;
  }
  return { ...info, amenities: listing.amenities, idealFor: readIdealFor(listing.idealFor), photos: listing.photos, rooms: listing.rooms };
}

// Country validation for the plain text field, shared by browser and server.
// ISO 3166-1 alpha-2 regions; no separate country-list dependency or autocomplete.
const ISO_COUNTRY_CODES = new Set(`AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(" "));

function countryKey(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .trim().replace(/\s+/g, " ").toLowerCase();
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const VALID_COUNTRY_NAMES = new Set(
  [...ISO_COUNTRY_CODES].map((code) => countryKey(regionNames.of(code) ?? code))
);

// Common alternate English names that owners may type.
const COUNTRY_ALIASES = new Set([
  "USA", "U.S.A.", "United States of America", "U.S.", "UK", "U.K.",
  "Turkey", "Ivory Coast", "Czech Republic", "East Timor", "Cape Verde",
  "Swaziland", "Vatican", "Palestine", "Burma", "Vietnam",
].map(countryKey));

export function isValidCountry(value: string) {
  const text = value.trim();
  if (!text) return false;
  return VALID_COUNTRY_NAMES.has(countryKey(text)) ||
    COUNTRY_ALIASES.has(countryKey(text)) ||
    ISO_COUNTRY_CODES.has(text.toUpperCase());
}

// Recognized regions for the two most common North American address formats.
// Other countries use a format check rather than pretending we can verify every subdivision.
// Build this separately so multiword names are preserved.
const US_STATE_NAMES = new Set([
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming", "Puerto Rico", "Guam", "U.S. Virgin Islands",
  "American Samoa", "Northern Mariana Islands",
].map(countryKey));
const US_STATE_CODES = new Set(`AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI AS MP`.split(" "));
const CA_PROVINCES = new Set([
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Québec",
  "Saskatchewan", "Yukon",
].map(countryKey));
const CA_PROVINCE_CODES = new Set(`AB BC MB NB NL NT NS NU ON PE QC SK YT`.split(" "));

export type PublishProblem = { tab: "photos" | "rooms"; message: string };
export function publicationProblem(draft: Pick<ListingDraft, "photos" | "rooms">): PublishProblem | null {
  if (draft.photos.length === 0) {
    return { tab: "photos", message: "Add at least one photo before publishing this property." };
  }
  if (draft.rooms.length === 0) {
    return { tab: "rooms", message: "Add at least one room type before publishing this property." };
  }
  return null;
}

export function validateHotelInfo(info: HotelInfo): HotelInfoErrors {
  const errors: HotelInfoErrors = {};
  const value = (field: keyof HotelInfo) => info[field].trim();

  if (!value("name")) errors.name = "Enter a property name";
  if (!PROPERTY_TYPES.includes(info.propertyType)) errors.propertyType = "Choose a valid property type";
  if (!value("streetAddress")) errors.streetAddress = "Enter a street address";
  if (!value("city")) errors.city = "Enter a city";
  else if (!/[\p{L}]/u.test(value("city"))) errors.city = "Enter a valid city name";

  const region = value("region");
  const postalCode = value("postalCode");
  const country = countryKey(value("country"));
  const isUS = ["united states", "united states of america", "us", "usa", "u.s.", "u.s.a."].includes(country);
  const isCA = ["canada", "ca"].includes(country);
  if (!region) errors.region = "Enter a state or region";
  else if (!/[\p{L}]/u.test(region) || !/^[\p{L}\p{M}\d .,'’()/-]+$/u.test(region)) {
    errors.region = "Enter a valid state or region";
  } else if (isUS && !US_STATE_NAMES.has(countryKey(region)) && !US_STATE_CODES.has(region.toUpperCase())) {
    errors.region = "Enter a valid U.S. state or territory";
  } else if (isCA && !CA_PROVINCES.has(countryKey(region)) && !CA_PROVINCE_CODES.has(region.toUpperCase())) {
    errors.region = "Enter a valid Canadian province or territory";
  }

  if (!postalCode) errors.postalCode = "Enter a postal code";
  else if (!/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(postalCode)) {
    errors.postalCode = "Use only letters, numbers, spaces and hyphens";
  } else if (isUS && !/^\d{5}(?:-\d{4})?$/.test(postalCode)) {
    errors.postalCode = "Enter a 5-digit ZIP code or ZIP+4";
  } else if (isCA && !/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(postalCode)) {
    errors.postalCode = "Enter a valid Canadian postal code";
  } else if (!isUS && !isCA && postalCode.replace(/[ -]/g, "").length < 3) {
    errors.postalCode = "Enter a valid postal code";
  }
  if (!value("country")) errors.country = "Enter a country";
  else if (!isValidCountry(value("country"))) errors.country = "Enter a valid country name";

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
