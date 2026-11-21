"use client";

import { redirect, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { choiceRedirect } from "@/lib/account/choice";

// Mounted by the root layout only for a signed-in viewer with no account type.
// A signpost, not a lock: blocking pages by type is #185's job.
export function ChoiceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = choiceRedirect(pathname, search);

  // A full page load, not a soft redirect: the layout that mounted this gate stays
  // cached in the tab, and only a fresh load re-reads the account type
  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);

  if (!target) return children;
  if (typeof window === "undefined") redirect(target);
  return null;
}
