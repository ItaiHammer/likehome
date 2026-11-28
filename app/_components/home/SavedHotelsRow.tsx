"use client";

import Link from "next/link";
import { useAccountChanged } from "@/app/_components/useAccountChanged";
import { HotelCardRow } from "@/app/_components/HotelCardRow";
import { ArrowIcon, arrowSlideClass, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import type { SavedHotelCards } from "@/lib/saved-hotel-cards";

// A heart cleared here keeps its card (with an empty heart) until the next page load, so focus stays put and
// it can be saved again. The row goes once another account (or nobody) is signed in: it was the old one's list.
export function SavedHotelsRow({ saved }: { saved: SavedHotelCards }) {
  const accountChanged = useAccountChanged();
  if (accountChanged || saved.cards.length === 0) return null;

  return (
    <HotelCardRow
      titleId="saved-hotels-title"
      title="Saved hotels"
      action={
        <Link href={PAGE_ROUTES.MY_BOOKINGS_SAVED} className={sectionLinkClass}>
          See all<span className="sr-only"> saved hotels</span>
          <ArrowIcon className={arrowSlideClass} />
        </Link>
      }
      cards={saved.cards}
      saveable
      carousel
    />
  );
}
