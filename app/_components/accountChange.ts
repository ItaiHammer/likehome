import { createClient } from "@/utils/supabase/client";

// The account signed in to this browser, followed across sign-in, sign-out and other tabs. Browser only.
type Listener = (accountId: string | null) => void;

const changeListeners = new Set<Listener>();
const knownListeners = new Set<Listener>();
// undefined until Supabase reports the first session
let current: string | null | undefined;
// The version also distinguishes A -> B -> A when React batches the notifications.
export type AccountSnapshot = { accountId: string | null | undefined; version: number };
export const UNKNOWN_ACCOUNT: AccountSnapshot = { accountId: undefined, version: 0 };
let snapshot = UNKNOWN_ACCOUNT;
let watching = false;

export const getAccountSnapshot = () => snapshot;

/** Subscribe to both the first known session and later identity changes. */
export function subscribeAccount(listener: () => void): () => void {
  const stopKnown = whenAccountKnown(listener);
  const stopChange = onAccountChange(listener);
  return () => {
    stopKnown();
    stopChange();
  };
}

function watch() {
  if (watching) return;
  watching = true;
  createClient().auth.onAuthStateChange((_event, session) => {
    const next = session?.user.id ?? null;
    if (current === undefined) {
      current = next;
      snapshot = { accountId: next, version: 0 };
      for (const listener of knownListeners) listener(next);
      knownListeners.clear();
      return;
    }
    if (next === current) return;
    current = next;
    snapshot = { accountId: next, version: snapshot.version + 1 };
    for (const listener of changeListeners) listener(next);
  });
}

/** Called each time the signed-in account changes after the first session is known (signed out, or another account). */
export function onAccountChange(listener: Listener): () => void {
  watch();
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/** Called once with the signed-in account (null when signed out), as soon as it's known. */
export function whenAccountKnown(listener: Listener): () => void {
  watch();
  if (current !== undefined) {
    listener(current);
    return () => {};
  }
  knownListeners.add(listener);
  return () => {
    knownListeners.delete(listener);
  };
}
