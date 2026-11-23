"use client";

import {useEffect, useState} from "react";
import type {Listing} from "@/types/listing";
import {ListingRow} from "./ListingRow";

export function MockListingRows({listings}: {listings: Listing[]}) {
  const [current, setCurrent] = useState(listings);
  useEffect(() => {
    setCurrent(listings.map((listing) => {
      try {
        const stored = window.localStorage.getItem(`likehome:mock-listing:${listing.id}`);
        if (stored) {
          const value: Listing = JSON.parse(stored);
          if (value.id === listing.id && Array.isArray(value.rooms) && Array.isArray(value.photos)) return value;
        }
      } catch { /* Ignore outdated or invalid browser-only sample data. */ }
      return listing;
    }));
  }, [listings]);
  return <ul className="space-y-4">{current.map((listing, index) => (
    <ListingRow key={listing.id} listing={listing} index={index} isSample />
  ))}</ul>;
}
