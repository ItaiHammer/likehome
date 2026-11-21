// Before favorites were stored on the account, the heart kept hotel ids in this browser key
export const LEGACY_SAVED_KEY = "likehome_saved_hotels";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** favorite_hotels.hotel_id references hotels.id, so only a hotels uuid can be saved (not a sample stay's slug). */
export function isHotelId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** The hotel ids in the old browser list that the account doesn't have yet. Sample stay slugs and junk are dropped. */
export function legacySavedIds(raw: string | null, alreadySaved: Iterable<string> = []): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const have = new Set([...alreadySaved].map((id) => id.toLowerCase()));
  const out: string[] = [];
  for (const value of parsed) {
    if (!isHotelId(value)) continue;
    const id = value.toLowerCase();
    if (have.has(id)) continue;
    have.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Whether the old browser list can be cleared after copying it to the account: every hotel was saved or
 * can never be (400 bad id, 404 hotel gone). A dropped connection (0), a server error or a lapsed
 * sign-in (401) keeps the list for the next page load.
 */
export function legacyCopyFinished(statuses: number[]): boolean {
  return statuses.every((s) => (s >= 200 && s < 300) || s === 400 || s === 404);
}
