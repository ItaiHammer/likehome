import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

/** Read once per request: the header and the page both need it */
export const getPointsBalance = cache(async (accountId: string) => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("points_balances")
    .select("balance")
    .eq("account_id", accountId)
    .maybeSingle();
  // no row yet = never earned anything
  return { balance: data?.balance ?? 0, error };
});

export async function getPointsHistory(accountId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("points_transactions")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  return { data, error };
}
