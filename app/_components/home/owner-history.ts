import { cache } from "react";
import type { HotelCustomerHistory } from "@/lib/hotel-customers";
import { getHotelCustomers } from "@/utils/hotel-customers";

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
