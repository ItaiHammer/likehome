import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { HISTORY_PAGE_SIZE, type HistoryFilter, type PointsActivity, type PointsTransactionType } from "@/lib/rewards";

// Read-only views of the points ledger (points_storage.sql); RLS limits rows to the signed-in account.

type ActivityRow = {
  id: string;
  type: PointsTransactionType;
  points: number;
  created_at: string;
  reservations: { hotels: { name: string | null } | null } | null;
};

// PostgREST's "range not satisfiable": a page past the last one
const PAGE_OUT_OF_RANGE = "PGRST103";

function toActivity(row: ActivityRow): PointsActivity {
  return {
    id: row.id,
    type: row.type,
    points: Number(row.points),
    createdAt: row.created_at,
    hotelName: row.reservations?.hotels?.name ?? null,
  };
}

/** Newest first, HISTORY_PAGE_SIZE per page; `total` counts every matching row */
export async function getRewardsHistory(accountId: string, { filter = "all", page = 1 }: { filter?: HistoryFilter; page?: number } = {}) {
  const supabase = createClient(await cookies());
  let query = supabase
    .from("points_transactions")
    .select("id, type, points, created_at, reservations(hotels(name))", { count: "exact" })
    .eq("account_id", accountId);
  if (filter === "earned") query = query.gt("points", 0);
  if (filter === "redeemed") query = query.lt("points", 0);

  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, from + HISTORY_PAGE_SIZE - 1);
  if (error?.code === PAGE_OUT_OF_RANGE) return { data: [], total: 0, error: null };
  return { data: ((data ?? []) as unknown as ActivityRow[]).map(toActivity), total: count ?? 0, error };
}

/** Points spent on one booking (checkout_reservation's 'redeem' rows), as a positive number */
export async function getPointsUsedOnBooking(reservationId: string) {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("points_transactions")
    .select("points")
    .eq("reservation_id", reservationId)
    .eq("type", "redeem");
  const used = (data ?? []).reduce((sum, row) => sum - Number(row.points), 0);
  return { data: used, error };
}
