import "server-only";
import { createClient } from "@supabase/supabase-js";

// Skips RLS and the reservations trigger, so only server code uses it: saving LiteAPI hotels, which have no owner
// whose session could write them, and bookings priced live by LiteAPI. null when SUPABASE_SECRET_KEY isn't set.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
