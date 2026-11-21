"use client";

import Link from "next/link";
import { HotelCardRow } from "@/app/_components/HotelCardRow";
import { useSavedHotels } from "@/app/_components/savedHotelsStore";
import { ArrowIcon, arrowSlideClass, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { shownSavedHotels, type SavedHotelCards } from "@/lib/saved-hotel-cards";

// A heart cleared here hides its card at once (and the row, with the last one); a failed removal brings it back
export function SavedHotelsRow({ saved }: { saved: SavedHotelCards }) {
  const hearts = useSavedHotels();
  const { cards, more } = shownSavedHotels(saved, hearts.status === "signed-in" ? hearts.ids : null);
  if (cards.length === 0) return null;

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
      cards={cards}
      saveable
      more={more ? { href: PAGE_ROUTES.MY_BOOKINGS_SAVED, label: "See all saved hotels" } : undefined}
    />
  );
}
