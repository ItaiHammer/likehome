import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Read-only history for the MyBookings dashboard. Both RPCs use auth.uid(), so no account id is passed.
// Amounts are completed transactions only; dates are YYYY-MM-DD.

export async function getBookingHistory() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("get_booking_history");
  return { data: data ?? [], error };
}

export async function getTransactionHistory() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc("get_transaction_history");
  return { data: data ?? [], error };
}
