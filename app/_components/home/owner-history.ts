import { cache } from "react";
import type { HotelCustomerHistory } from "@/lib/hotel-customers";
import { getHotelCustomers } from "@/utils/hotel-customers";
import { getMyListings } from "@/utils/listings";

// The owner's customer and booking history for all their listings. The guests card and the stat tiles
// both use it, so it's read once per request. null when the read failed.
export const loadOwnerHistory = cache(async (): Promise<HotelCustomerHistory | null> => {
  try {
    const result = await getHotelCustomers();
    if (result.ok) return result.data;
    console.error("Owner history read failed:", result.reason);
  } catch (error) {
    console.error("Owner history read failed:", error);
  }
  return null;
});

// The owner's listings with their rooms, as My Listings shows them. Your properties and This week both
// use it, so it's read once per request. null when the read failed.
export const loadOwnerListings = cache(async (ownerId: string) => {
  try {
    const { data, error } = await getMyListings(ownerId);
    if (!error && data) return data;
    console.error("Listings read failed", error);
  } catch (error) {
    console.error("Listings read failed", error);
  }
  return null;
});
