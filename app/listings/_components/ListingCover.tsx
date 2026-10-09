"use client";

// Client Component: it swaps in the placeholder when the image fails to load (a broken link or a dropped connection).
import Image from "next/image";
import { useState } from "react";
import type { ListingPhoto } from "@/types/listing";

// The listing's cover photo in a rounded box, or a placeholder when it has no photos yet.
// The parent sets the size with className (e.g. "aspect-[3/2] w-60"). `zoom`: grows a little when a parent `group` is hovered.
// `eager`: for the main photo at the top of a page, so it isn't lazy-loaded (Next flags it as the LCP image otherwise).
export function ListingCover({
  photo,
  sizes,
  className = "",
  zoom = false,
  eager = false,
}: {
  photo?: ListingPhoto;
  sizes: string;
  className?: string;
  zoom?: boolean;
  eager?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = photo !== undefined && failedUrl === photo.url;

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-disabled ${className}`}>
      {photo && !failed ? (
        // blob: URLs (mock uploads) only exist in this browser, so Next's image optimizer can't fetch them
        <Image
          src={photo.url}
          alt={photo.caption}
          fill
          sizes={sizes}
          loading={eager ? "eager" : undefined}
          unoptimized={photo.url.startsWith("blob:")}
          onError={() => setFailedUrl(photo.url)}
          className={`object-cover ${zoom ? "transition-transform duration-500 ease-out group-hover:scale-[1.03]" : ""}`}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 16 5-5 4 4 3-3 6 6" strokeLinejoin="round" />
            <circle cx="15.5" cy="9.5" r="1.5" />
          </svg>
          {failed ? <span className="text-sm">Photo unavailable</span> : <span className="sr-only">No photo yet</span>}
        </div>
      )}
    </div>
  );
}
