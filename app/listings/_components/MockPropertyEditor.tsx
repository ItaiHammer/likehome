"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import type {Listing} from "@/types/listing";
import type {EditorTab} from "./editor-state";
import {PropertyEditor} from "./PropertyEditor";
import {readSampleListing} from "./sample-listings";

export function MockPropertyEditor({listing, listingId, initialTab, initialPreview}: {
  listing?: Listing;
  listingId: string;
  initialTab: EditorTab;
  initialPreview: boolean;
}) {
  const [current, setCurrent] = useState<Listing | null | undefined>(undefined);
  useEffect(() => {
    setCurrent(readSampleListing(listingId) ?? listing ?? null);
  }, [listing, listingId]);
  if (current === undefined) return <div className="mx-auto w-full max-w-6xl px-6 py-12 text-slate" role="status">Loading sample property…</div>;
  if (current === null) return <div className="mx-auto max-w-6xl px-6 py-12"><p className="text-ink">This sample property is not in this browser.</p><Link className="mt-3 inline-block text-blue" href="/listings?sample=1">Back to sample listings</Link></div>;
  return <PropertyEditor listing={current} initialTab={initialTab} initialPreview={initialPreview} sampleMode />;
}
