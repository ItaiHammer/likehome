import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Travelers a user saved to prefill checkout. RLS limits every query to the user's own rows.
// is_default is never written directly: at most one default is allowed per account, so
// switching it goes through set_default_saved_traveler, which does both updates at once.

type AddressFields = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type AccountDetails = { phone?: string | null } & AddressFields;

export async function createSavedTraveler(traveler: {
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
} & AddressFields) {
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
  } & AddressFields>,
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

/**
 * Account Details (phone + address) live on the user's default traveler. Updates it, or creates one
 * filled from the account (first word of full_name, the rest as last name, and the account email)
 * since first_name, last_name and email are required.
 */
export async function saveAccountDetails(accountId: string, details: AccountDetails) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing, error: findError } = await supabase
    .from("saved_travelers")
    .select("id")
    .eq("account_id", accountId)
    .eq("is_default", true)
    .maybeSingle();
  if (findError) return { data: null, error: findError };

  if (existing) {
    const { data, error } = await supabase
      .from("saved_travelers")
      .update(details)
      .eq("id", existing.id)
      .select()
      .single();
    return { data, error };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("full_name, email")
    .eq("id", accountId)
    .single();
  if (accountError || !account?.email) return { data: null, error: accountError ?? { message: "Account email not found." } };

  const [first, ...rest] = String(account.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = first || String(account.email).split("@")[0];
  const { data, error } = await supabase
    .from("saved_travelers")
    .insert({
      account_id: accountId,
      first_name: firstName,
      // last_name can't be blank, so a one-word name is used for both
      last_name: rest.join(" ") || firstName,
      email: account.email,
      ...details,
    })
    .select()
    .single();
  if (error || !data) return { data, error };

  const { error: defaultError } = await supabase.rpc("set_default_saved_traveler", { p_id: data.id });
  return { data: defaultError ? null : data, error: defaultError };
}
