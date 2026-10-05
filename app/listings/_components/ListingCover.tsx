import Image from "next/image";
import type { ListingPhoto } from "@/types/listing";

// The listing's cover photo in a rounded box, or a placeholder when it has no photos yet.
// The parent sets the size with className (e.g. "aspect-[3/2] w-60").
export function ListingCover({ photo, sizes, className = "" }: { photo?: ListingPhoto; sizes: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-disabled ${className}`}>
      {photo ? (
        // blob: URLs (mock uploads) only exist in this browser, so Next's image optimizer can't fetch them
        <Image src={photo.url} alt={photo.caption} fill sizes={sizes} unoptimized={photo.url.startsWith("blob:")} className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-slate">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 16 5-5 4 4 3-3 6 6" strokeLinejoin="round" />
            <circle cx="15.5" cy="9.5" r="1.5" />
          </svg>
          <span className="sr-only">No photo yet</span>
        </div>
      )}
    </div>
  );
}
