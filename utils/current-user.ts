import { connection } from "next/server";
import { MOCK_OWNER_ID } from "@/mocks/listings";

export type CurrentUser = { id: string };

// Mock until hotel owners exist. Real version: supabase.auth.getClaims() → { id: claims.sub }, or null when signed out.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  await connection(); // per-user data: render at request time, as reading the real auth cookies will
  return { id: MOCK_OWNER_ID };
}
