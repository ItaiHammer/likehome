// Saved hotels, kept in this browser's localStorage until they move to the favorite_hotels table (#153).
// A small external store so components read it with useSyncExternalStore instead of setState in an effect.

const KEY = "likehome_saved_hotels";
const EVENT = "saved_hotels_updated";
const EMPTY: string[] = [];

/** Reads the stored list; anything that isn't a JSON array of ids (old or hand-edited data) counts as empty. */
export function parseSavedIds(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    const ids = value.filter((id) => typeof id === "string" || typeof id === "number").map(String);
    return [...new Set(ids)];
  } catch {
    return EMPTY;
  }
}

/** Saves the hotel if it isn't saved yet, otherwise removes it. Newest saves go last. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id];
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage blocked (private mode, sandboxed frame)
  }
}

// useSyncExternalStore needs the same array back until the stored value changes
let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY;

export function getSavedIds(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseSavedIds(raw);
  }
  return cachedIds;
}

/** What the server renders: nothing saved, since it can't see localStorage. */
export function getServerSavedIds(): string[] {
  return EMPTY;
}

/** Updates this tab (custom event) and other tabs (storage event). */
export function subscribeSavedIds(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleSavedHotel(id: string): void {
  const next = toggleId(getSavedIds(), id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return; // storage blocked: leave the heart as it was
  }
  window.dispatchEvent(new Event(EVENT));
}
