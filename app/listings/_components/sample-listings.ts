import type {Listing} from "@/types/listing";

const PREFIX = "likehome:mock-listing:";
const INDEX = "likehome:mock-listings:created";

function validListing(value: unknown): value is Listing {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Listing>;
  return typeof item.id === "string" && item.id.startsWith("mock-") &&
    typeof item.name === "string" && Array.isArray(item.rooms) &&
    Array.isArray(item.photos) && Array.isArray(item.amenities);
}

export function readSampleListing(id: string): Listing | null {
  if (!id.startsWith("mock-")) return null;
  try {
    const data = window.localStorage.getItem(`${PREFIX}${id}`);
    if (!data) return null;
    const parsed: unknown = JSON.parse(data);
    return validListing(parsed) && parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
}

function createdIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(INDEX) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string =>
      typeof id === "string" && id.startsWith("mock-created-")) : [];
  } catch {
    return [];
  }
}

export function readSampleListings(bundled: Listing[]): Listing[] {
  const saved = bundled.map((listing) => readSampleListing(listing.id) ?? listing);
  const seen = new Set(saved.map((listing) => listing.id));
  for (const id of createdIds()) {
    const listing = readSampleListing(id);
    if (listing && !seen.has(id)) {
      saved.push(listing);
      seen.add(id);
    }
  }
  return saved;
}

export function saveSampleListing(listing: Listing, isNew: boolean): void {
  if (!validListing(listing)) throw new Error("Invalid sample listing");
  const storage = window.localStorage;
  // Check quota before modifying the index; if storage is full, the editor displays an error.
  storage.setItem(`${PREFIX}${listing.id}`, JSON.stringify(listing));
  if (isNew) {
    const ids = createdIds();
    if (!ids.includes(listing.id)) {
      try {
        storage.setItem(INDEX, JSON.stringify([...ids, listing.id]));
      } catch (err) {
        storage.removeItem(`${PREFIX}${listing.id}`);
        throw err;
      }
    }
  }
}
