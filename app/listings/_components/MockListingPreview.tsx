"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import type {Listing} from "@/types/listing";
import {ListingPreview} from "./ListingPreview";
import {readSampleListing} from "./sample-listings";

export function MockListingPreview({listingId, fallback}: {listingId: string; fallback?: Listing}) {
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  useEffect(() => {
    setListing(readSampleListing(listingId) ?? fallback ?? null);
  }, [listingId, fallback]);
  if (listing === undefined) return <p role="status" className="p-6 text-slate">Loading sample preview…</p>;
  if (!listing) return <p className="p-6 text-slate">This sample property was not found in this browser.</p>;
  return (
    <ListingPreview
      draft={{...listing, idealFor: listing.idealFor ?? []}}
      backLink={<Link href="/listings?sample=1" className="inline-flex items-center gap-2 text-sm font-semibold text-blue hover:text-blue-dark"><span aria-hidden>←</span> Back to My listings</Link>}
    />
  );
}
