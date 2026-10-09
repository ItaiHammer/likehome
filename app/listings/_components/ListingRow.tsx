import Link from "next/link";
import { Button, Tag } from "@/app/_components/ui";
import { formatLocation, formatPrice, lowestRate, needsAttention, plural } from "@/lib/listing-display";
import type { Listing } from "@/types/listing";
import { ListingCover } from "./ListingCover";

// One property on My listings, styled like the home page's stay cards. `index` staggers the entrance.
export function ListingRow({ listing, index }: { listing: Listing; index: number }) {
  const editHref = `/listings/${listing.id}/edit`;
  const rate = lowestRate(listing.rooms);

  return (
    <li className="tile-in" style={{ "--i": index } as React.CSSProperties}>
      <article className="group flex flex-col gap-5 rounded-lg border border-edge bg-surface p-4 transition-[border-color,box-shadow] duration-300 hover:border-blue/50 hover:shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] sm:flex-row sm:p-5">
        <ListingCover photo={listing.photos[0]} sizes="(min-width: 640px) 256px, 100vw" zoom eager={index === 0} className="aspect-[3/2] w-full border border-edge sm:w-64" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h2 className="font-serif text-[32px] leading-[38px] text-ink">{listing.name}</h2>
              <p className="mt-1 text-slate">{formatLocation(listing)}</p>
            </div>
            {rate !== null && (
              <p className="text-ink">
                <span className="font-semibold">From {formatPrice(rate)}</span>
                <span className="text-slate"> / night</span>
              </p>
            )}
          </div>

          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Listing details">
            <li>
              <Tag size="md">{plural(listing.rooms.length, "room type")}</Tag>
            </li>
            {needsAttention(listing).map((todo) => (
              <li key={todo.tab}>
                <Link
                  href={`${editHref}?tab=${todo.tab}`}
                  className="inline-flex items-center gap-1.5 rounded-control border border-danger/50 px-2.5 py-1 text-sm text-danger transition-colors hover:bg-danger/10"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M12 7v6M12 16.5h.01" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  {todo.label}
                  <span className="sr-only"> to {listing.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-edge pt-4 sm:mt-auto">
            <Link href={editHref} className="group/edit inline-flex items-center gap-1.5 font-semibold text-blue hover:text-blue-dark">
              Edit property<span className="sr-only">: {listing.name}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-200 group-hover/edit:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Button variant="secondary" size="sm" href={`${editHref}?preview=1`}>
              Preview<span className="sr-only">: {listing.name}</span>
            </Button>
          </div>
        </div>
      </article>
    </li>
  );
}
