import { Button } from "@/app/_components/ui";
import { formatLocation, formatRoomCount } from "@/lib/listing-display";
import type { Listing } from "@/types/listing";
import { ListingCover } from "./ListingCover";

export function ListingRow({ listing }: { listing: Listing }) {
  return (
    <li className="flex flex-col gap-5 border-b border-edge py-8 sm:flex-row sm:items-start sm:gap-8">
      <ListingCover photo={listing.photos[0]} sizes="(min-width: 640px) 240px, 100vw" className="aspect-[3/2] w-full sm:w-60" />
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-3xl leading-tight text-ink">{listing.name}</h2>
        <p className="mt-3 text-lg text-slate">{formatLocation(listing)}</p>
        <p className="mt-2 text-sm text-slate">{formatRoomCount(listing.rooms)}</p>
      </div>
      <Button variant="secondary" href={`/listings/${listing.id}/edit`}>
        Edit property<span className="sr-only">: {listing.name}</span>
      </Button>
    </li>
  );
}
