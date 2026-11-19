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

// The columns get_transaction_history returns (booking_history.sql): the id is transaction_id
export type { TransactionRow as TransactionHistoryRow } from "@/lib/bookings";

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
    // The hotel is gone, so there's nothing to rebook
    unlisted: !row.hotel_id || !row.hotel_name,
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
// Owner side (US 4.7.3). Both RPCs check hotels.owner_id = auth.uid() in the database.
// hotelId scopes to one listing; omit it for all of the owner's listings.
// today (YYYY-MM-DD, the viewer's date) decides each booking's stage; omit it for UTC.
// A hotel the caller doesn't own returns error.code "42501".

export async function getHotelBookingHistory(hotelId?: string, today?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("get_hotel_booking_history", {
    p_hotel_id: hotelId ?? null,
    p_today: today ?? null,
  });
  return { data: data ?? [], error };
}

export async function getHotelCustomerHistory(hotelId?: string, today?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("get_hotel_customer_history", {
    p_hotel_id: hotelId ?? null,
    p_today: today ?? null,
  });
  return { data: data ?? [], error };
}
