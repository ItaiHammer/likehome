"use server";

import { revalidatePath } from "next/cache";
import { draftFromListing, readListingDraft, validateHotelInfo, type HotelInfoErrors } from "@/lib/validation/listing";
import type { ListingDraft } from "@/types/listing";
import { getCurrentUser } from "@/utils/current-user";
import { createListing, getListing, updateListing } from "@/utils/listings";

export type SaveResult =
  | { status: "saved"; id: string; saved: ListingDraft }
  | { status: "invalid"; errors: HotelInfoErrors }
  | { status: "failed"; message?: string };

// save_listing says why rooms couldn't be removed (they have bookings): show that, not a generic error
function failed(error: unknown): SaveResult {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === "P0001" && e.message ? { status: "failed", message: e.message } : { status: "failed" };
}

// Anyone can call a server action with any arguments, so nothing from the browser is trusted:
// check who's asking, rebuild the input, and validate it again.

export async function saveListing(listingId: unknown, input: unknown): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user || typeof listingId !== "string") return { status: "failed" };

  const { data: listing } = await getListing(listingId);
  if (!listing || listing.ownerId !== user.id) return { status: "failed" };

  const draft = readListingDraft(input);
  if (!draft) return { status: "failed" }; // malformed rooms or photos: never sent by the real UI
  const errors = validateHotelInfo(draft);
  if (Object.keys(errors).length > 0) return { status: "invalid", errors };

  const { data, error } = await updateListing(listingId, draft);
  if (error || !data) return failed(error);

  revalidatePath("/listings");
  return { status: "saved", id: data.id, saved: draftFromListing(data) };
}

export async function createProperty(input: unknown): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "failed" };

  const draft = readListingDraft(input);
  if (!draft) return { status: "failed" }; // malformed rooms or photos: never sent by the real UI
  const errors = validateHotelInfo(draft);
  if (Object.keys(errors).length > 0) return { status: "invalid", errors };

  const { data, error } = await createListing(user.id, draft);
  if (error || !data) return failed(error);

  revalidatePath("/listings");
  return { status: "saved", id: data.id, saved: draftFromListing(data) };
}
