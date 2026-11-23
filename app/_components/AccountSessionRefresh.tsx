"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getAccountSnapshot, subscribeAccount, UNKNOWN_ACCOUNT } from "./accountChange";

// Stays mounted for every role, including signed out and business accounts. A traveler-only
// observer would disappear with the bell and miss the next account signing in in another tab.
export function AccountSessionRefresh({ accountId }: { accountId: string | null }) {
  const router = useRouter();
  const identity = useSyncExternalStore(subscribeAccount, getAccountSnapshot, () => UNKNOWN_ACCOUNT);
  const seenVersion = useRef(identity.version);
  useEffect(() => {
    // Run after Supabase's synchronous auth callback has returned.
    if (identity.accountId === undefined) return;
    const changed = identity.version !== seenVersion.current;
    seenVersion.current = identity.version;
    // A -> B -> A also needs a new A request to supersede an older B refresh still in flight,
    // even when A already matches the currently rendered server props.
    if (changed || identity.accountId !== accountId) router.refresh();
  }, [identity.accountId, identity.version, accountId, router]);
  return null;
}
