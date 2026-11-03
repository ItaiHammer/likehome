import Link from "next/link";

export type PriceStatus = "checking" | "needs-dates" | "sold-out" | "unavailable";

export type HotelSearchResult = {
  id?: string;
  name?: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  photo_urls?: string[] | null;
  min_price?: number | string | null;
  max_capacity?: number | string | null;
  available_rooms?: number | string | null;
  rating?: number | string | null;
  tags?: string[] | null;
  num_beds?: number | string | null;
  bed_size?: string | null;
  liteapi_id?: string | null;
  /** Shown instead of a price */
  price_status?: PriceStatus;
};

const PRICE_NOTES: Record<PriceStatus, string> = {
  checking: "Checking prices…",
  "needs-dates": "Add dates to see prices",
  "sold-out": "Sold out for your dates",
  unavailable: "Price unavailable",
};

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 18v-7M20 18v-5a2 2 0 0 0-2-2H9a3 3 0 0 0-3 3v1M4 15h16M7 11V8h4a3 3 0 0 1 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a2.5 2.5 0 0 1 0 5M17 14a4 4 0 0 1 3.5 4" strokeLinecap="round" />
    </svg>
  );
}

function formatLocation(stay: HotelSearchResult) {
  const pieces = [stay.city, stay.region, stay.country].filter(Boolean);
  return pieces.length ? pieces.join(", ") : stay.address || "Location available at booking";
}

function asNumber(value: HotelSearchResult["min_price"]) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// `search` is the current search's query string: the stay page opens on a room that matches it, and its
// Back to stays link returns here
export function SearchResultCard({ stay, eager = false, search = "" }: { stay: HotelSearchResult; eager?: boolean; search?: string }) {
  const photo = stay.photo_urls?.find(Boolean);
  const price = asNumber(stay.min_price);
  const capacity = asNumber(stay.max_capacity);
  const availableRooms = asNumber(stay.available_rooms);
  const rating = asNumber(stay.rating);
  // A LiteAPI hotel that isn't saved yet opens by its LiteAPI id
  const slug = stay.id ?? stay.liteapi_id;
  const href = slug ? `/reserve/${slug}${search ? `?${search}` : ""}` : null;

  const media = photo ? (
    // A plain <img> so photos below the fold can lazy-load: next.config doesn't list image hosts yet.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={`${stay.name ?? "Stay"} photo`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgba(68,115,181,0.22),transparent_38%),linear-gradient(145deg,rgba(68,115,181,0.12),rgba(68,115,181,0.03))]">
      <span className="font-serif text-5xl text-blue/50">{stay.name?.trim().charAt(0) || "L"}</span>
    </div>
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-edge bg-surface shadow-[0_18px_45px_-34px_rgba(7,13,47,0.45)] transition-transform duration-200 hover:-translate-y-0.5">
      {href ? (
        // A mouse shortcut to the same page as "View stay", so Tab and screen readers skip it
        <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[16/10] overflow-hidden bg-blue/10">
          {media}
        </Link>
      ) : (
        <div className="relative aspect-[16/10] overflow-hidden bg-blue/10">{media}</div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{stay.name || "LikeHome stay"}</h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-slate">
              <PinIcon />
              <span>{formatLocation(stay)}</span>
            </p>
          </div>
          {rating !== null && (
            <span className="shrink-0 rounded-full bg-blue/10 px-2.5 py-1 text-xs font-semibold text-blue-dark">★ {rating.toFixed(1)}</span>
          )}
        </div>

        {stay.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate">{stay.description}</p>}

        {stay.tags && stay.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stay.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-blue/20 bg-blue/5 px-2.5 py-1 text-xs font-medium text-blue-dark">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate">
          {capacity !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-paper/40 px-2.5 py-1.5">
              <UsersIcon /> Up to {capacity} guests
            </span>
          )}
          {availableRooms !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-paper/40 px-2.5 py-1.5">
              <BedIcon /> {availableRooms} available
            </span>
          )}
        </div>

        {/* Pinned to the bottom so prices line up across a row of cards */}
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4 border-t border-edge pt-4">
            {stay.price_status ? (
              <p className={`text-sm font-medium text-slate ${stay.price_status === "checking" ? "animate-pulse" : ""}`}>
                {PRICE_NOTES[stay.price_status]}
              </p>
            ) : (
              <div>
                <p className="text-xs text-slate">From</p>
                <p className="mt-0.5 text-lg font-semibold text-ink">
                  {price !== null ? `$${price.toFixed(0)}` : "Price on request"}
                  {price !== null && <span className="text-sm font-normal text-slate"> / night</span>}
                </p>
              </div>
            )}
            {href ? (
              <Link
                href={href}
                className="rounded-control text-sm font-semibold text-blue hover:text-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
              >
                View stay<span className="sr-only"> at {stay.name || "this hotel"}</span>
              </Link>
            ) : (
              <span className="text-sm font-semibold text-slate">Sample stay</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
