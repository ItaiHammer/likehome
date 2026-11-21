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

const isOk = (status: number) => status >= 200 && status < 300;
const copyDone = (status: number) => isOk(status) || status === 400 || status === 404;

/**
 * Whether the old browser list can be cleared after copying it to the account: every hotel was saved or
 * can never be (400 bad id, 404 hotel gone). A dropped connection (0), a server error, a lapsed sign-in (401)
 * or an account that can't save hotels (403) keeps those hotels for the next personal account to sign in here.
 */
export function legacyCopyFinished(statuses: number[]): boolean {
  return statuses.every(copyDone);
}

/** The hotels from a copy that still have to go to an account; the rest are dropped from the browser list. */
export function legacyCopyLeft(ids: string[], statuses: number[]): string[] {
  return ids.filter((_, i) => !copyDone(statuses[i]));
}

// "unavailable": signed in to an account that can't save hotels (only personal accounts can), so no hearts
export type SavedStatus = "loading" | "signed-in" | "signed-out" | "error" | "unavailable";

export type SavedHotels = {
  status: SavedStatus;
  ids: ReadonlySet<string>;
  // true when ids is the account's whole list; otherwise only the hotels in `known` are certain
  listed: boolean;
  // Hotels toggled here, whose saved state is known without the list
  known: ReadonlySet<string>;
};

export const NO_SAVED_HOTELS: SavedHotels = { status: "loading", ids: new Set(), listed: false, known: new Set() };

const blank = (status: SavedStatus): SavedHotels => ({ status, ids: new Set(), listed: false, known: new Set() });

export function withId(ids: ReadonlySet<string>, id: string, saved: boolean): ReadonlySet<string> {
  const next = new Set(ids);
  if (saved) next.add(id);
  else next.delete(id);
  return next;
}

/** What a heart shows. `fallback` (the server render's answer) only stands in until the store knows this hotel. */
export function shownSaved(state: SavedHotels, hotelId: string, fallback = false): boolean {
  if (state.status === "signed-out" || state.status === "unavailable") return false;
  if (state.listed || state.known.has(hotelId)) return state.ids.has(hotelId);
  return fallback;
}

/** A freshly read list with the toggles laid over it: ones done since the read started, then ones still on their way. */
export function mergeLoaded(ids: Iterable<string>, ...toggles: ReadonlyMap<string, boolean>[]): ReadonlySet<string> {
  let merged: ReadonlySet<string> = new Set(ids);
  for (const map of toggles) for (const [id, saved] of map) merged = withId(merged, id, saved);
  return merged;
}

export type ToggleResult = "saved" | "removed" | "signed-out" | "unavailable" | "failed" | "busy";

// The last toggle that failed, for the one live region on the page; n changes so the same message is read again
export type SaveFailure = { message: string; n: number };

type Answer = { status: number; ok: boolean; json(): Promise<unknown> };

export type SavedHotelsIO = {
  list(): Promise<Answer>;
  send(method: "POST" | "DELETE", hotelId: string): Promise<Pick<Answer, "status" | "ok">>;
  storage(): LegacyStorage | null;
};

type LegacyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** One shared copy of the signed-in user's saved hotels, so a page of hearts reads the list once. */
export function createSavedHotelsStore(io: SavedHotelsIO) {
  let state = NO_SAVED_HOTELS;
  let failure: SaveFailure | null = null;
  let loadedFor: string | null = null;
  let lastPage: string | null = null;
  let legacyCopied = false;
  // The copy in progress, kept across account changes: the next account's copy waits for it and then reads
  // what is left in the key, so the same old hearts are never sent for two accounts
  let legacyCopy: Promise<void> = Promise.resolve();
  // Bumped on every account change, so answers to the old account's requests are dropped
  let generation = 0;
  // The saved state each toggle wants, laid over a list that loads meanwhile: toggles still waiting on the
  // server, and ones that went through after that read started (its answer may predate them)
  const inFlight = new Map<string, boolean>();
  const doneSinceLoad = new Map<string, boolean>();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };
  const setState = (next: SavedHotels) => {
    state = next;
    notify();
  };
  const mark = (id: string, saved: boolean) =>
    setState({ ...state, ids: withId(state.ids, id, saved), known: withId(state.known, id, true) });
  // A failed read keeps the last known ids; it doesn't bring hearts back for a signed-out or non-personal visitor
  const readFailed = () => {
    if (state.status !== "signed-out" && state.status !== "unavailable") setState({ ...state, status: "error" });
  };
  const announceFailure = (message: string) => {
    failure = { message, n: (failure?.n ?? 0) + 1 };
    notify();
  };

  // Hearts saved in this browser before favorites moved to the account: copied once into a personal account
  // (the list only loads for one), then the key keeps only the hotels that didn't go through
  function copyLegacyFavorites(saved: string[]) {
    if (legacyCopied) return legacyCopy;
    legacyCopied = true;
    const gen = generation;
    legacyCopy = legacyCopy.then(() => copyLegacyNow(saved, gen)).catch(() => {});
    return legacyCopy;
  }

  async function copyLegacyNow(saved: string[], gen: number) {
    // The account changed while an earlier copy was finishing; the new account's own load starts its copy
    if (gen !== generation) return;
    let storage: LegacyStorage | null;
    let raw: string | null;
    try {
      storage = io.storage();
      raw = storage?.getItem(LEGACY_SAVED_KEY) ?? null;
    } catch {
      return;
    }
    if (!storage || raw === null) return;
    const ids = legacySavedIds(raw, saved);
    const statuses = await Promise.all(ids.map((id) => io.send("POST", id).then((r) => r.status, () => 0)));
    if (gen === generation) {
      let merged = state.ids;
      ids.forEach((id, i) => {
        if (!isOk(statuses[i]) || inFlight.has(id)) return;
        merged = withId(merged, id, true);
        doneSinceLoad.set(id, true);
      });
      if (merged !== state.ids) setState({ ...state, ids: merged });
    }
    try {
      if (legacyCopyFinished(statuses)) storage.removeItem(LEGACY_SAVED_KEY);
      else storage.setItem(LEGACY_SAVED_KEY, JSON.stringify(legacyCopyLeft(ids, statuses)));
    } catch {}
  }

  // Once per page: the list is read again after a navigation, so a heart changed elsewhere shows here
  function load(key: string) {
    lastPage = key;
    if (loadedFor === key) return;
    loadedFor = key;
    doneSinceLoad.clear();
    const gen = generation;
    const stillWanted = () => gen === generation && loadedFor === key;
    return io
      .list()
      .then(async (res) => {
        if (!stillWanted()) return;
        if (res.status === 401) return setState(blank("signed-out"));
        if (res.status === 403) return setState(blank("unavailable"));
        if (!res.ok) return readFailed();
        const body = await res.json();
        if (!stillWanted()) return;
        const data = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
        const ids = Array.isArray(data) ? data.filter(isHotelId) : [];
        setState({ status: "signed-in", ids: mergeLoaded(ids, doneSinceLoad, inFlight), listed: true, known: new Set() });
        return copyLegacyFavorites(ids);
      })
      .catch(() => {
        if (stillWanted()) readFailed();
      });
  }

  // Signing out, or into another account, drops the old list at once and reads it again
  function accountChanged(next: string | null) {
    generation++;
    loadedFor = null;
    doneSinceLoad.clear();
    inFlight.clear();
    legacyCopied = false;
    setState(blank(next ? "loading" : "signed-out"));
    if (next && lastPage) void load(lastPage);
  }

  /** Flips the heart at once and puts it back if the server says no. A second tap while the first is on its way is ignored ("busy"). */
  // `current` is what the heart shows, which before the list loads can come from the server render
  async function toggle(hotelId: string, current = shownSaved(state, hotelId)): Promise<ToggleResult> {
    if (state.status === "unavailable") return "unavailable";
    if (inFlight.has(hotelId)) return "busy";
    const save = !current;
    // A toggle that finishes after the account changed leaves the new account's list alone
    const gen = generation;
    const sameAccount = () => gen === generation;
    inFlight.set(hotelId, save);
    mark(hotelId, save);
    const fail = () => {
      if (!sameAccount()) return "failed" as const;
      mark(hotelId, !save);
      announceFailure(save ? "Couldn't save this hotel. Try again." : "Couldn't remove this hotel from your saved hotels. Try again.");
      return "failed" as const;
    };
    try {
      const res = await io.send(save ? "POST" : "DELETE", hotelId);
      if (res.ok) {
        if (sameAccount()) doneSinceLoad.set(hotelId, save);
        return save ? "saved" : "removed";
      }
      if (res.status === 401) {
        if (sameAccount()) setState(blank("signed-out"));
        return "signed-out";
      }
      if (res.status === 403) {
        if (sameAccount()) setState(blank("unavailable"));
        return "unavailable";
      }
      return fail();
    } catch {
      return fail();
    } finally {
      if (sameAccount()) inFlight.delete(hotelId);
    }
  }

  return {
    getState: () => state,
    getFailure: () => failure,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    accountChanged,
    toggle,
  };
}
