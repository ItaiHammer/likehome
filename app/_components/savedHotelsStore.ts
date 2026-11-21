import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { API_ROUTES } from "@/constants/routes";
import { isHotelId, LEGACY_SAVED_KEY, legacyCopyFinished, legacySavedIds } from "@/lib/saved-hotels";

// One shared copy of the signed-in user's saved hotels, so a page of hearts reads the list once.
// "loading" until the first answer; "error" keeps the last known ids.
export type SavedHotels = {
  status: "loading" | "signed-in" | "signed-out" | "error";
  ids: ReadonlySet<string>;
};

const INITIAL: SavedHotels = { status: "loading", ids: new Set() };
let state = INITIAL;
let loadedFor: string | null = null;
let legacyCopied = false;
// The saved state each toggle wants, laid over a list that loads meanwhile: toggles still waiting on the
// server, and ones that went through after that read started (its answer may predate them)
const inFlight = new Map<string, boolean>();
const doneSinceLoad = new Map<string, boolean>();
// The last toggle that failed, for the one live region on the page; n changes so the same message is read again
export type SaveFailure = { message: string; n: number };
let failure: SaveFailure | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function setState(next: SavedHotels) {
  state = next;
  notify();
}

function announceFailure(message: string) {
  failure = { message, n: (failure?.n ?? 0) + 1 };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const withId = (ids: ReadonlySet<string>, id: string, saved: boolean) => {
  const next = new Set(ids);
  if (saved) next.add(id);
  else next.delete(id);
  return next;
};

function send(method: "POST" | "DELETE", hotelId: string) {
  return fetch(API_ROUTES.FAVORITES, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hotelId }),
  });
}

// Hearts saved in this browser before favorites moved to the account: copied once, then the key is cleared
async function copyLegacyFavorites(saved: string[]) {
  if (legacyCopied) return;
  legacyCopied = true;
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_SAVED_KEY);
  } catch {
    return;
  }
  if (raw === null) return;
  const ids = legacySavedIds(raw, saved);
  const statuses = await Promise.all(ids.map((id) => send("POST", id).then((r) => r.status, () => 0)));
  let merged = state.ids;
  ids.forEach((id, i) => {
    if (statuses[i] === 200) merged = withId(merged, id, true);
  });
  if (merged !== state.ids) setState({ ...state, ids: merged });
  if (legacyCopyFinished(statuses)) {
    try {
      localStorage.removeItem(LEGACY_SAVED_KEY);
    } catch {}
  }
}

// Once per page: the list is read again after a navigation, so a heart changed elsewhere shows here
function load(key: string) {
  if (loadedFor === key) return;
  loadedFor = key;
  doneSinceLoad.clear();
  fetch(API_ROUTES.FAVORITES, { cache: "no-store" })
    .then(async (res) => {
      if (loadedFor !== key) return;
      if (res.status === 401) return setState({ status: "signed-out", ids: new Set() });
      if (!res.ok) return setState({ ...state, status: "error" });
      const body: unknown = await res.json();
      const data = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
      const ids = Array.isArray(data) ? data.filter(isHotelId) : [];
      let merged: ReadonlySet<string> = new Set(ids);
      for (const [id, saved] of [...doneSinceLoad, ...inFlight]) merged = withId(merged, id, saved);
      setState({ status: "signed-in", ids: merged });
      void copyLegacyFavorites(ids);
    })
    .catch(() => {
      if (loadedFor === key) setState({ ...state, status: "error" });
    });
}

export type ToggleResult = "saved" | "removed" | "signed-out" | "failed" | "busy";

/** Flips the heart at once and puts it back if the server says no. A second tap while the first is on its way is ignored ("busy"). */
// `current` is what the heart shows, which before the list loads can come from the server render
export async function toggleSavedHotel(hotelId: string, current = state.ids.has(hotelId)): Promise<ToggleResult> {
  if (inFlight.has(hotelId)) return "busy";
  const save = !current;
  inFlight.set(hotelId, save);
  setState({ ...state, ids: withId(state.ids, hotelId, save) });
  const fail = () => {
    setState({ ...state, ids: withId(state.ids, hotelId, !save) });
    announceFailure(save ? "Couldn't save this hotel. Try again." : "Couldn't remove this hotel from your saved hotels. Try again.");
    return "failed" as const;
  };
  try {
    const res = await send(save ? "POST" : "DELETE", hotelId);
    if (res.ok) {
      doneSinceLoad.set(hotelId, save);
      return save ? "saved" : "removed";
    }
    if (res.status === 401) {
      setState({ status: "signed-out", ids: new Set() });
      return "signed-out";
    }
    return fail();
  } catch {
    return fail();
  } finally {
    inFlight.delete(hotelId);
  }
}

export function useSavedHotels(): SavedHotels {
  const pathname = usePathname();
  useEffect(() => load(pathname), [pathname]);
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}

/** The last failed save or removal, without reading the list (for the page's live region). */
export function useSaveFailure(): SaveFailure | null {
  return useSyncExternalStore(subscribe, () => failure, () => null);
}
