import { WindowScene, type SceneVariant } from "../../_components/WindowScene";

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
  mock_variant?: SceneVariant;
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

export function SearchResultCard({ stay }: { stay: HotelSearchResult }) {
  const photo = stay.photo_urls?.find(Boolean);
  const price = asNumber(stay.min_price);
  const capacity = asNumber(stay.max_capacity);
  const availableRooms = asNumber(stay.available_rooms);
  const rating = asNumber(stay.rating);

  return (
    <article className="group overflow-hidden rounded-2xl border border-edge bg-surface shadow-[0_18px_45px_-34px_rgba(7,13,47,0.45)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative aspect-[16/10] overflow-hidden bg-blue/10">
        {photo ? (
          <div
            role="img"
            aria-label={`${stay.name ?? "Stay"} photo`}
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.025]"
            style={{ backgroundImage: `url(${JSON.stringify(photo).slice(1, -1)})` }}
          />
        ) : stay.mock_variant ? (
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.025]">
            <WindowScene variant={stay.mock_variant} id={`mock-scene-${String(stay.id ?? stay.name ?? "stay")}`} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgba(68,115,181,0.22),transparent_38%),linear-gradient(145deg,rgba(68,115,181,0.12),rgba(68,115,181,0.03))]">
            <span className="font-serif text-5xl text-blue/50">{stay.name?.trim().charAt(0) || "L"}</span>
          </div>
        )}
      </div>

      <div className="p-5">
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

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-edge pt-4">
          <div>
            <p className="text-xs text-slate">From</p>
            <p className="mt-0.5 text-lg font-semibold text-ink">
              {price !== null ? `$${price.toFixed(0)}` : "Price on request"}
              {price !== null && <span className="text-sm font-normal text-slate"> / night</span>}
            </p>
          </div>
          {/* TODO(ROUTE): Link this card once database hotel IDs/slugs are connected to the stay detail route. */}
          <span className="text-sm font-semibold text-blue">View stay</span>
        </div>
      </div>
    </article>
  );
}
