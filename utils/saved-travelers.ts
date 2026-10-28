import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Travelers a user saved to prefill checkout. RLS limits every query to the user's own rows.
// is_default is never written directly: at most one default is allowed per account, so
// switching it goes through set_default_saved_traveler, which does both updates at once.

export async function createSavedTraveler(traveler: {
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_travelers")
    .insert(traveler)
    .select();
  return { data, error };
}

export async function getSavedTraveler(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_travelers")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

/** Default traveler first, then newest. */
export async function getSavedTravelersByAccount(accountId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_travelers")
    .select("*")
    .eq("account_id", accountId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function updateSavedTraveler(
  id: string,
  updates: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  }>,
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_travelers")
    .update(updates)
    .eq("id", id)
    .select();
  return { data, error };
}

export async function setDefaultSavedTraveler(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.rpc("set_default_saved_traveler", {
    p_id: id,
  });
  return { error };
}

export async function deleteSavedTraveler(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("saved_travelers")
    .delete()
    .eq("id", id);
  return { error };
}
