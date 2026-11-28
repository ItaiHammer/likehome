import { PROPERTY_TYPE_LABELS, formatPrice } from "@/lib/listing-display";
import type { ListingDraft } from "@/types/listing";
import { PhotoGallery } from "@/app/reserve/[slug]/PhotoGallery";
import { StayOffers } from "@/app/reserve/[slug]/StayOffers";
import { stayDisplayName } from "@/app/_components/stayDisplayName";
import { IdealFor } from "@/app/reserve/[slug]/IdealFor";
import { displayAmenityLabel } from "@/app/search/types";
import { propertyWideOffers, roomOnlyAmenities } from "@/lib/stay-filters";
import { amenitiesToTags, countryToStored } from "@/lib/listing-storage";

// A visual-only version of the public listing. It never books, favorites or changes draft data.
export function ListingPreview({ draft, backLink }: { draft: ListingDraft; backLink: React.ReactNode }) {
  const roomsByPrice = [...draft.rooms].sort((a, b) => a.nightlyRateCents - b.nightlyRateCents);
  const selected = roomsByPrice[0];
  // The public stay page uses the stored city, region, and country, in that order.
  const location = [draft.city, draft.region, countryToStored(draft.country)].filter(Boolean).join(", ");
  const editorTags = amenitiesToTags(draft.amenities);
  const listedOffers = propertyWideOffers(editorTags, draft.rooms.map((room) => room.amenities ?? []));
  const propertyOffers = [
    ...listedOffers,
    // The public listing also includes owner-added amenities outside the search filter catalog.
    ...editorTags.filter((label) => !listedOffers.some((offer) => offer.label === label)).map((label) => ({ label })),
  ];
  const propertyVisible = propertyOffers.map((offer) => offer.label);
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">{backLink}</div>
      <p className="mb-6 text-sm text-slate"><span className="font-semibold text-ink">Preview only.</span> Unsaved changes are included. Booking and favorites are disabled.</p>

      <PhotoGallery stayName={draft.name || "Untitled property"} photos={draft.photos.map((photo) => photo.url)} />

      <header className="mt-7">
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 flex-1 break-words text-balance font-serif text-[40px] leading-[48px] text-ink sm:text-[52px] sm:leading-[60px]">{stayDisplayName(draft.name) || "Untitled property"}</h1>
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

      {draft.idealFor.length > 0 && <IdealFor categories={draft.idealFor} className="mt-5" />}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <fieldset disabled className="min-w-0">
          <legend className="text-[32px] font-bold leading-10 text-ink">Choose a room</legend>
          <div className="mt-5 space-y-4">
            {roomsByPrice.map((room, i) => (
              <div key={room.id} className={`flex items-center gap-4 rounded-control border bg-surface p-4 sm:gap-6 sm:px-5 ${i === 0 ? "border-blue ring-1 ring-blue" : "border-edge"}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{room.roomType || "Room type"}</p>
                  <p className="mt-1 text-sm text-slate">{room.bedConfiguration ? `${room.bedConfiguration} · ` : ""}Sleeps {room.maxGuests}</p>
                  {roomOnlyAmenities(room.amenities, propertyVisible).length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {roomOnlyAmenities(room.amenities, propertyVisible).map((tag) => (
                        <li key={tag} className="rounded-full border border-edge px-2 py-0.5 text-xs text-blue">{displayAmenityLabel(tag)}</li>
                      ))}
                    </ul>
                  )}
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
          <p className="mt-5 flex min-h-8 items-center justify-center text-center text-sm font-bold text-ink">Non-refundable unless insured</p>
          <div className="mt-5 rounded-control border border-blue/30 bg-blue/5 p-4 text-sm text-ink">
            <p className="font-semibold">Business accounts are unable to book stays.</p>
            <p className="mt-1 text-slate">Reservations require a personal account.</p>
          </div>
        </aside>
      </div>

      {propertyVisible.length > 0 && (
        <section className="mt-10 rounded-2xl border border-edge bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-ink">Amenities</h2>
          <p className="mt-2 text-sm leading-5 text-slate">All amenities listed here are available property-wide. Room-specific amenities appear with each room.</p>
          <StayOffers offers={propertyOffers} goodFor={[]} />
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
