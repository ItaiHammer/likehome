import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Which of these LiteAPI hotels are saved, including ones LiteAPI removed (search keeps those hidden)
export async function savedLiteapiIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("hotels").select("liteapi_id").in("liteapi_id", ids);
  if (error) throw error;
  return new Set((data ?? []).flatMap((row) => (row.liteapi_id ? [row.liteapi_id as string] : [])));
}
