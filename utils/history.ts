import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Booking } from "@/lib/bookings";
// Read-only history for the MyBookings dashboard. Both RPCs use auth.uid(), so no account id is passed.
// Amounts are completed transactions only; dates are YYYY-MM-DD.

export type BookingHistoryRow = {
  reservation_id: string;
  check_in: string;
  check_out: string;
  guests: number | null;
  status: string | null;
  total_price: number | string;
  has_insurance: boolean;
  cancelled_at: string | null;
  cancellation_fee: number | string | null;
  hotel_id: string | null;
  hotel_name: string | null;
  city: string | null;
  photo_url: string | null;
  room_type: string | null;
  amount_charged: number | string;
  amount_insurance: number | string;
  amount_credited: number | string;
  points_earned: number;
  points_refunded: number;
};

export function toBooking(row: BookingHistoryRow): Booking {
  return {
    id: row.reservation_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: row.guests,
    status: row.status ?? "confirmed",
    hotelName: row.hotel_name ?? "Hotel no longer listed",
    city: row.city,
    photoUrl: row.photo_url,
    roomType: row.room_type,
  };
}

export async function getMyBookings() {
  const { data, error } = await getBookingHistory();

  if (error) {
    return { data: null, error };
  }

  return {
    data: data.map(toBooking),
    error: null,
  };
}

export async function getBookingHistory() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("get_booking_history");
  return { data: (data ?? []) as BookingHistoryRow[], error };
}

export async function getTransactionHistory() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("get_transaction_history");
  return { data: data ?? [], error };
}