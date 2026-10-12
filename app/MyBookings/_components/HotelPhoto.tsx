"use client";

import { useState } from "react";

export function HotelPhoto({ url, priority = false, className = "" }: { url: string | null; priority?: boolean; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = url !== null && failedUrl === url;

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-disabled ${className}`}>
      {url && !failed ? (
        // A plain <img>: hotel photos can come from any host, and next.config doesn't list image hosts yet.
        // The ref catches a photo that failed before the page's JS loaded: React never replays that onError.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setFailedUrl(url);
          }}
          src={url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          onError={() => setFailedUrl(url)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 16 5-5 4 4 3-3 6 6" strokeLinejoin="round" />
            <circle cx="15.5" cy="9.5" r="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
