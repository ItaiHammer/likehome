import { MOCK_LISTINGS, MOCK_SAVE_FAILS } from "@/mocks/listings";
import type { Listing, ListingDraft } from "@/types/listing";

// Mock data access for the listing editor. Same { data, error } shape as utils/hotels.ts on Chloe's branch,
// so swapping in Supabase only changes this file.

// In-memory "table", kept on globalThis because Next can load this module more than once
// (pages vs. server actions, and again on hot reload). Edits last until the dev server restarts.
const store = globalThis as typeof globalThis & { __mockListings?: Listing[] };
const listings = (store.__mockListings ??= structuredClone(MOCK_LISTINGS));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Callers get copies, so changing a returned object can't change the "table".
const copy = <T>(value: T): T => structuredClone(value);

export async function getMyListings(ownerId: string) {
  const data = listings.filter((listing) => listing.ownerId === ownerId);
  return { data: copy(data), error: null };
}

export async function getListing(id: string) {
  const listing = listings.find((l) => l.id === id);
  return listing ? { data: copy(listing), error: null } : { data: null, error: "Listing not found" };
}

export async function createListing(ownerId: string, draft: ListingDraft) {
  await delay(800);
  if (MOCK_SAVE_FAILS) return { data: null, error: "Mock save failure" };

  const listing: Listing = { ...draft, id: crypto.randomUUID(), ownerId, photos: [], rooms: [] };
  listings.push(listing);
  return { data: copy(listing), error: null };
}

export async function updateListing(id: string, updates: Partial<Omit<Listing, "id" | "ownerId">>) {
  await delay(800);
  if (MOCK_SAVE_FAILS) return { data: null, error: "Mock save failure" };

  const index = listings.findIndex((l) => l.id === id);
  if (index === -1) return { data: null, error: "Listing not found" };

  listings[index] = { ...listings[index], ...copy(updates) };
  return { data: copy(listings[index]), error: null };
}
