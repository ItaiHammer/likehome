"use client";

import {useEffect, useState} from "react";
import type {Listing} from "@/types/listing";
import {ListingRow} from "./ListingRow";
import {readSampleListings} from "./sample-listings";

export function MockListingRows({listings}: {listings: Listing[]}) {
  const [current, setCurrent] = useState(listings);
  useEffect(() => {
    const refresh = () => setCurrent(readSampleListings(listings));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [listings]);
  return <ul className="space-y-4">{current.map((listing, index) => (
    <ListingRow key={listing.id} listing={listing} index={index} isSample />
  ))}</ul>;
}
