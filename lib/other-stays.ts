import type { OtherStay } from "@/lib/bookings";
import { getHotelsByIds } from "@/utils/hotels";
import { todayUTC } from "@/utils/reservation-logic";
import { getReservationsByAccount } from "@/utils/reservations";

// The guest's upcoming confirmed bookings at other hotels, which the database won't let a new or
// changed stay overlap (reservations_no_account_overlap). /api/checkout and the edit API answer that
// refusal with "Room is not available", so the card checks these first to say what's actually wrong.
// Best effort: on any error the APIs still refuse the overlap.
export async function getOtherStays(userId: string, hotelId: string, excludeReservationId?: string): Promise<OtherStay[]> {
  const today = todayUTC();
  const { data, error } = await getReservationsByAccount(userId);
  if (error || !data) return [];

  const rows = data.filter(
    (r) => (r.status ?? "confirmed") === "confirmed" && r.hotel_id !== hotelId && r.id !== excludeReservationId && r.check_out > today,
  );
  if (rows.length === 0) return [];

  const { data: hotels } = await getHotelsByIds([...new Set(rows.map((r) => r.hotel_id))]);
  const names = new Map(hotels?.map((h) => [h.id, h.name as string]));
  return rows.map((r) => ({ checkIn: r.check_in, checkOut: r.check_out, hotelName: names.get(r.hotel_id) ?? "another hotel" }));
}
