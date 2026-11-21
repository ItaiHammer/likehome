import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Cards a user saved for checkout. Only brand + last4 are stored, never the
// full number or CVC. A different card is a new row, so updates only touch name and expiry.
// is_default switches through set_default_saved_payment_method, like saved travelers.

export type CardBrand = "visa" | "mastercard" | "amex" | "discover";

export async function createSavedPaymentMethod(method: {
  account_id: string;
  brand: CardBrand;
  last4: string;
  exp_month: number;
  exp_year: number;
  name_on_card: string;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .insert(method)
    .select();
  return { data, error };
}

export async function getSavedPaymentMethod(id: string, accountId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .select("*")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();
  return { data, error };
}

/** Default card first, then newest. */
export async function getSavedPaymentMethodsByAccount(accountId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .select("*")
    .eq("account_id", accountId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function updateSavedPaymentMethod(
  id: string,
  updates: Partial<{
    exp_month: number;
    exp_year: number;
    name_on_card: string;
  }>,
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .update(updates)
    .eq("id", id)
    .select();
  return { data, error };
}

export async function setDefaultSavedPaymentMethod(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.rpc("set_default_saved_payment_method", {
    p_id: id,
  });
  return { error };
}

/** Scoped to the account as well as RLS; `deleted` is false when no such card is theirs. */
export async function deleteSavedPaymentMethod(id: string, accountId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .delete()
    .eq("id", id)
    .eq("account_id", accountId)
    .select("id");
  return { deleted: (data ?? []).length > 0, error };
}
