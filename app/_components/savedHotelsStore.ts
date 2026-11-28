import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { API_ROUTES } from "@/constants/routes";
import { createSavedHotelsStore, NO_SAVED_HOTELS, type SavedHotels, type SaveFailure } from "@/lib/saved-hotels";
import { onAccountChange } from "./accountChange";

export type { SavedHotels, SaveFailure, ToggleResult } from "@/lib/saved-hotels";

const store = createSavedHotelsStore({
  list: () => fetch(API_ROUTES.FAVORITES, { cache: "no-store" }),
  send: (method, hotelId) =>
    fetch(API_ROUTES.FAVORITES, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId }),
    }),
  storage: () => window.localStorage,
});

let watchingAuth = false;

// Signing out, or into another account (here or in another tab), drops the old list at once and reads it again
function watchAuth() {
  if (watchingAuth) return;
  watchingAuth = true;
  onAccountChange(store.accountChanged);
}

export const toggleSavedHotel = store.toggle;

export function useSavedHotels(): SavedHotels {
  const pathname = usePathname();
  useEffect(() => {
    watchAuth();
    void store.load(pathname);
  }, [pathname]);
  return useSyncExternalStore(store.subscribe, store.getState, () => NO_SAVED_HOTELS);
}

/** The last failed save or removal, without reading the list (for the page's live region). */
export function useSaveFailure(): SaveFailure | null {
  return useSyncExternalStore(store.subscribe, store.getFailure, () => null);
}
