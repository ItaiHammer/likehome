"use client";

import { useEffect, useState } from "react";

type CreationKind = "created" | "sample" | null;

export function ListingCreationToast({ kind }: { kind: CreationKind }) {
  const [visible, setVisible] = useState(kind !== null);

  useEffect(() => {
    if (!kind) return;

    // Avoid displaying the success notification again if the page is refreshed.
    const url = new URL(window.location.href);
    if (url.searchParams.has("created")) {
      url.searchParams.delete("created");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }

    const timer = window.setTimeout(() => setVisible(false), 15000);
    return () => window.clearTimeout(timer);
  }, [kind]);

  if (!kind || !visible) return null;

  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-6 right-6 z-[80] flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-edge bg-surface px-5 py-5 font-sans text-ink shadow-lg">
      <span aria-hidden="true" className="text-2xl font-semibold text-blue-dark">✓</span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-ink">
          {kind === "sample" ? "Sample creation tested" : "Property created"}
        </p>
        <p className="mt-1 text-sm text-slate">
          {kind === "sample"
            ? "Test successful. No property was saved or published."
            : "Your property is now on My listings."}
        </p>
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)}
        className="rounded-control px-1 text-lg text-slate hover:text-ink focus-visible:outline-2 focus-visible:outline-blue">
        ×
      </button>
    </div>
  );
}
