import { AMENITY_LABELS, formatLocation, formatPrice, formatRoomTypesSummary } from "@/lib/listing-display";
import type { ListingDraft } from "@/types/listing";
import { ListingCover } from "./ListingCover";

// Read-only view of the current draft (unsaved changes included), laid out the way guests will see it.
export function ListingPreview({ draft, onBack }: { draft: ListingDraft; onBack: () => void }) {
  const [cover, ...others] = draft.photos;

  return (
    <main className="w-full flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-blue hover:text-blue-dark">
          ‹ Back to editing
        </button>
        <p className="mt-6 text-sm text-slate">Preview</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">{draft.name || "Untitled property"}</h1>
        <p className="mt-4 text-lg text-slate">{formatLocation(draft) || "No address yet"}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-[2fr_1fr]">
          <ListingCover photo={cover} sizes="(min-width: 768px) 700px, 100vw" className="aspect-[16/10] w-full" />
          {others.length > 0 && (
            <div className="grid gap-4">
              {others.slice(0, 2).map((photo) => (
                <ListingCover key={photo.id} photo={photo} sizes="(min-width: 768px) 350px, 100vw" className="aspect-[16/10] w-full md:aspect-auto md:h-full" />
              ))}
            </div>
          )}
        </div>

        {draft.description && <p className="mt-6 max-w-3xl text-lg text-ink">{draft.description}</p>}
        {draft.amenities.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-slate" aria-label="Amenities">
            {draft.amenities.map((amenity) => (
              <li key={amenity}>{AMENITY_LABELS[amenity]}</li>
            ))}
          </ul>
        )}

        <h2 className="mt-10 text-[1.75rem] leading-9 font-medium text-ink">Rooms</h2>
        <p className="mt-1 text-lg text-slate">{formatRoomTypesSummary(draft.rooms)}</p>
        <ul className="mt-6 space-y-5">
          {draft.rooms.map((room) => (
            <li key={room.id} className="flex flex-wrap gap-x-6 gap-y-1 text-ink">
              <span>{room.roomType}</span>
              <span>{room.bedConfiguration}</span>
              <span>{room.maxGuests === 1 ? "1 guest" : `${room.maxGuests} guests`}</span>
              <span>{formatPrice(room.nightlyRateCents)} / night</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
