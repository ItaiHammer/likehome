import { MOCK_OWNER_ID } from "@/mocks/listings";

export type CurrentUser = { id: string };

// Mock until hotel owners exist. Real version: supabase.auth.getClaims() → { id: claims.sub }, or null when signed out.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return { id: MOCK_OWNER_ID };
}
