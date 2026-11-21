import Link from "next/link";
import { ListingRow } from "@/app/listings/_components/ListingRow";
import { ArrowIcon, arrowSlideClass, SectionHeading, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { getMyListings } from "@/utils/listings";
import { ShortcutTile } from "./ShortcutTile";
import { pulse } from "./styles";

const TITLE = "Your properties";
const TITLE_ID = "owner-properties-title";
const SHOWN = 2;

async function loadListings(ownerId: string) {
  try {
    const { data, error } = await getMyListings(ownerId);
    if (!error && data) return data;
    console.error("Listings read failed", error);
  } catch (error) {
    console.error("Listings read failed", error);
  }
  return null;
}

// The first two of the owner's listings, as My Listings shows them. A failed read hides the section.
export async function OwnerProperties({ ownerId }: { ownerId: string }) {
  const listings = await loadListings(ownerId);
  if (!listings) return null;
  const shown = listings.slice(0, SHOWN);

  return (
    <section aria-labelledby={TITLE_ID}>
      <SectionHeading
        id={TITLE_ID}
        title={TITLE}
        subtitle={shown.length > 0 ? "Pick up where you left off, or see what still needs doing." : "Guests can book once your place is listed."}
        action={
          shown.length > 0 && (
            <Link href={PAGE_ROUTES.LISTINGS} className={sectionLinkClass}>
              See all listings
              <ArrowIcon className={arrowSlideClass} />
            </Link>
          )
        }
      />
      {shown.length > 0 ? (
        // [&>li]:grid lets each card fill its row, so the two side by side end level
        <ul className="mt-6 grid gap-4 lg:grid-cols-2 [&>li]:grid">
          {shown.map((listing, i) => (
            <ListingRow key={listing.id} listing={listing} index={i} headingLevel="h3" />
          ))}
        </ul>
      ) : (
        <div className="mt-6 max-w-xl">
          <ShortcutTile label="List your first place" hint="Add its details, photos and rooms. You can save as you go." href={PAGE_ROUTES.LISTINGS_NEW} icon="add" />
        </div>
      )}
    </section>
  );
}

export function OwnerPropertiesSkeleton() {
  return (
    <section aria-busy="true" aria-labelledby={TITLE_ID}>
      <SectionHeading id={TITLE_ID} title={TITLE} />
      <div aria-hidden className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className={`h-64 sm:h-48 ${pulse}`} />
        <div className={`hidden h-48 lg:block ${pulse}`} />
      </div>
    </section>
  );
}
