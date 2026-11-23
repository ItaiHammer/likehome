import { AMENITY_LABELS, PROPERTY_TYPE_LABELS, formatLocation, formatPrice } from "@/lib/listing-display";
import type { ListingDraft } from "@/types/listing";
import { ListingCover } from "./ListingCover";

// A visual-only version of the public listing. It never books, favorites or changes draft data.
export function ListingPreview({ draft, backLink }: { draft: ListingDraft; backLink: React.ReactNode }) {
  const [cover, ...others] = draft.photos;
  const selected = draft.rooms[0];
  const location = formatLocation(draft);
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">{backLink}</div>
      <p className="mb-6 text-sm text-slate"><span className="font-semibold text-ink">Preview only.</span> Unsaved changes are included. Booking and favorites are disabled.</p>

      {draft.photos.length <= 1 ? (
        <ListingCover
          photo={cover}
          sizes="(min-width: 1024px) 1152px, 100vw"
          eager
          className="aspect-[16/9] w-full border border-edge md:h-[390px] md:aspect-auto"
        />
      ) : (
        <div className="grid gap-3 md:h-[390px] md:grid-cols-[2fr_1fr]">
          <ListingCover photo={cover} sizes="(min-width: 768px) 700px, 100vw" eager className="aspect-[16/10] w-full border border-edge md:aspect-auto md:h-full" />
          {draft.photos.length === 2 ? (
            <ListingCover photo={others[0]} sizes="(min-width: 768px) 350px, 100vw" className="aspect-[16/10] w-full border border-edge md:aspect-auto md:h-full" />
          ) : (
            <div className="grid grid-rows-2 gap-3">
              {others.slice(0, 2).map((photo) => (
                <ListingCover key={photo.id} photo={photo} sizes="(min-width: 768px) 350px, 100vw" className="aspect-[16/10] w-full border border-edge md:aspect-auto md:h-full" />
              ))}
            </div>
          )}
        </div>
      )}

      <header className="mt-7">
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 flex-1 break-words text-balance font-serif text-[40px] leading-[48px] text-ink sm:text-[52px] sm:leading-[60px]">{draft.name || "Untitled property"}</h1>
          <span aria-label="Favorite unavailable in preview" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-slate opacity-60">♡</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-base text-slate">
          <p>{location || "No address yet"}</p>
          <p className="text-sm">Listing type: <span className="capitalize">{PROPERTY_TYPE_LABELS[draft.propertyType] || "Not selected"}</span></p>
        </div>
      </header>

      {draft.description.trim() && (
        <section className="mt-10 rounded-2xl border border-edge bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-ink">About this property</h2>
          <p className="mt-3 whitespace-pre-line leading-7 text-slate">{draft.description}</p>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <fieldset disabled className="min-w-0">
          <legend className="text-[32px] font-bold leading-10 text-ink">Choose a room</legend>
          <div className="mt-5 space-y-4">
            {draft.rooms.map((room, i) => (
              <div key={room.id} className={`flex items-center gap-4 rounded-control border bg-surface p-4 sm:gap-6 sm:px-5 ${i === 0 ? "border-blue ring-1 ring-blue" : "border-edge"}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{room.roomType || "Room type"}</p>
                  <p className="mt-1 text-sm text-slate">{room.bedConfiguration ? `${room.bedConfiguration} · ` : ""}Sleeps {room.maxGuests}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-ink">{formatPrice(room.nightlyRateCents)}</p>
                  <p className="text-sm text-slate">per night</p>
                </div>
                <span className={`hidden h-[46px] w-28 shrink-0 items-center justify-center rounded-control text-base font-semibold sm:inline-flex ${i === 0 ? "bg-blue/60 text-on-blue" : "border border-edge text-slate"}`}>{i === 0 ? "Selected" : "Select"}</span>
              </div>
            ))}
            {draft.rooms.length === 0 && <p className="text-slate">Room types will appear here once added.</p>}
          </div>
        </fieldset>
        <aside className="rounded-2xl border border-edge bg-surface p-5 sm:p-6 lg:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <p><span className="text-[32px] font-bold leading-10 text-ink">{selected ? formatPrice(selected.nightlyRateCents) : "—"}</span><span className="text-base text-slate"> / night</span></p>
            {selected && <p className="truncate text-sm text-slate">{selected.roomType}</p>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-ink">Check-in<input disabled placeholder="Add date" className="mt-2 h-[46px] w-full rounded-control border border-edge bg-surface px-3 text-base" /></label>
            <label className="text-sm font-semibold text-ink">Check-out<input disabled placeholder="Add date" className="mt-2 h-[46px] w-full rounded-control border border-edge bg-surface px-3 text-base" /></label>
          </div>
          <label className="mt-5 block text-sm font-semibold text-ink">Guests
            <div className="mt-2 flex h-[46px] items-center justify-between rounded-control border border-edge bg-surface px-4 text-base font-normal text-ink">2 adults <span aria-hidden className="text-slate">⌄</span></div>
          </label>
          <div className="mt-5 flex items-center justify-between gap-3 text-base"><span className="text-slate">Room</span><span className="font-semibold text-ink">{selected?.roomType || "Not selected"}</span></div>
          <p className="mt-5 text-sm text-slate">Add your dates to see the total for your stay.</p>
          <div className="mt-5 rounded-control border border-blue/30 bg-blue/5 p-4 text-sm text-ink">
            <p className="font-semibold">Business accounts are unable to book stays.</p>
            <p className="mt-1 text-slate">Reservations require a personal account.</p>
          </div>
        </aside>
      </div>

      {draft.amenities.length > 0 && (
        <section className="mt-10 rounded-2xl border border-edge bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-ink">Amenities</h2>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {draft.amenities.map((amenity) => <li key={amenity} className="flex items-start gap-2 text-slate"><span aria-hidden className="text-blue">✓</span>{AMENITY_LABELS[amenity]}</li>)}
          </ul>
        </section>
      )}
      <section className="mt-12">
        <h2 className="font-serif text-[30px] text-ink">Find the best stay for you</h2>
        <p className="mt-2 text-slate">Compare this property with stays you recently viewed.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Recently viewed card layout preview">
          {Array.from({ length: 3 }, (_, i) => <PreviewStayCard key={i} />)}
        </div>
        <div className="mt-6 flex justify-end"><span aria-disabled="true" className="rounded-control bg-blue/60 px-5 py-3 font-semibold text-on-blue">Compare listings</span></div>
      </section>
      <section className="mt-12">
        <h2 className="font-serif text-[32px] text-ink">Similar stays</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Similar stays card layout preview">
          {Array.from({ length: 3 }, (_, i) => <PreviewStayCard key={i} />)}
        </div>
      </section>
    </main>
  );
}

// Empty outlines represent guest-specific cards without inventing property details.
function PreviewStayCard() {
  return (
    <div aria-hidden="true" className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-edge bg-surface">
      <div className="aspect-[16/10] border-b border-edge bg-disabled/30" />
      <div className="flex flex-1 flex-col p-5">
        <div className="h-6 w-3/4 rounded bg-disabled/40" />
        <div className="mt-3 h-4 w-1/2 rounded bg-disabled/40" />
        <div className="mt-6 h-4 w-full rounded bg-disabled/40" />
        <div className="mt-2 h-4 w-5/6 rounded bg-disabled/40" />
        <div className="mt-5 flex gap-2">
          <div className="h-7 w-28 rounded-full border border-edge" />
          <div className="h-7 w-24 rounded-full border border-edge" />
        </div>
        <div className="mt-auto border-t border-edge pt-5">
          <div className="h-5 w-28 rounded bg-disabled/40" />
        </div>
      </div>
    </div>
  );
}
