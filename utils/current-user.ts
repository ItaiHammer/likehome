import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export type CurrentUser = {
  id: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) return null;

  return { id: userId };
}