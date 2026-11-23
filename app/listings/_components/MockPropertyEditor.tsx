"use client";

import {useEffect, useState} from "react";
import type {Listing} from "@/types/listing";
import type {EditorTab} from "./editor-state";
import {PropertyEditor} from "./PropertyEditor";

export function MockPropertyEditor({listing, initialTab, initialPreview}: {
  listing: Listing;
  initialTab: EditorTab;
  initialPreview: boolean;
}) {
  const [current, setCurrent] = useState<Listing | null>(null);
  useEffect(() => {
    let initial = listing;
    try {
      const stored = window.localStorage.getItem(`likehome:mock-listing:${listing.id}`);
      if (stored) {
        const value: Listing = JSON.parse(stored);
        if (value.id === listing.id && Array.isArray(value.photos) && Array.isArray(value.rooms)) initial = value;
      }
    } catch { /* Use bundled mock data when browser storage is unavailable. */ }
    setCurrent(initial);
  }, [listing]);
  if (!current) return <div className="mx-auto w-full max-w-6xl px-6 py-12 text-slate" role="status">Loading sample property…</div>;
  return <PropertyEditor listing={current} initialTab={initialTab} initialPreview={initialPreview} sampleMode />;
}
