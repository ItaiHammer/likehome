import { Tag } from "@/app/_components/ui";
import { AMENITY_LABELS, formatLocation, formatPrice, formatRoomTypesSummary } from "@/lib/listing-display";
import type { ListingDraft } from "@/types/listing";
import { ListingCover } from "./ListingCover";

// Read-only view of the current draft (unsaved changes included), laid out the way guests will see it.
export function ListingPreview({ draft, backLink }: { draft: ListingDraft; backLink: React.ReactNode }) {
  const [cover, ...others] = draft.photos;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-blue/20 bg-blue/10 px-5 py-4">
        <p className="text-ink">
          <span className="font-semibold">Preview.</span> This is how guests will see your listing, unsaved changes included.
        </p>
        {backLink}
      </div>

      <h1 className="mt-10 font-serif text-[40px] leading-[48px] text-ink sm:text-[56px] sm:leading-[64px]">{draft.name || "Untitled property"}</h1>
      <p className="mt-3 text-lg text-slate">{formatLocation(draft) || "No address yet"}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-[2fr_1fr]">
        <ListingCover photo={cover} sizes="(min-width: 768px) 700px, 100vw" eager className="aspect-[16/10] w-full border border-edge" />
        {others.length > 0 && (
          <div className="grid gap-4">
            {others.slice(0, 2).map((photo) => (
              <ListingCover
                key={photo.id}
                photo={photo}
                sizes="(min-width: 768px) 350px, 100vw"
                className="aspect-[16/10] w-full border border-edge md:aspect-auto md:h-full"
              />
            ))}
          </div>
        )}
      </div>

      {draft.description && <p className="mt-8 max-w-3xl text-lg leading-8 text-ink">{draft.description}</p>}
      {draft.amenities.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Amenities">
          {draft.amenities.map((amenity) => (
            <li key={amenity}>
              <Tag size="md">{AMENITY_LABELS[amenity]}</Tag>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-[32px] leading-10 font-bold text-ink">Rooms</h2>
      <p className="mt-1 text-lg text-slate">{formatRoomTypesSummary(draft.rooms)}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {draft.rooms.map((room) => (
          <li key={room.id} className="flex flex-col rounded-lg border border-edge bg-surface p-5">
            <p className="font-serif text-xl text-ink">{room.roomType}</p>
            <p className="mt-1 text-sm text-slate">
              {room.bedConfiguration} · {room.maxGuests === 1 ? "1 guest" : `${room.maxGuests} guests`}
            </p>
            <p className="mt-4 border-t border-edge pt-3 text-sm text-ink">
              <span className="font-semibold">{formatPrice(room.nightlyRateCents)}</span>
              <span className="text-slate"> / night</span>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
