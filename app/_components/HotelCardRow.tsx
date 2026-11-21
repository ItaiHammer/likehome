import { HotelPhoto } from "@/app/MyBookings/_components/HotelPhoto";
import { SaveHotelButton } from "@/app/_components/SaveHotelButton";
import { ArrowIcon, arrowSlideClass, Card, SectionHeading, swipeItemClass, swipeRowClass } from "@/app/_components/ui";
import type { HotelCard } from "@/lib/recently-viewed";

// A homepage row of hotel cards (photo, name, location), four across, swiping sideways on phones
export function HotelCardRow({
  titleId,
  title,
  subtitle,
  action,
  cards,
  saveable = false,
  more,
}: {
  titleId: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  cards: HotelCard[];
  /** A heart on each photo */
  saveable?: boolean;
  /** A last tile linking to the full list */
  more?: { href: string; label: string };
}) {
  return (
    <section aria-labelledby={titleId}>
      <SectionHeading id={titleId} title={title} subtitle={subtitle} action={action} />
      {/* On phones the padding keeps a focused card's ring and the entrance slide inside the scroll box, and the margin takes it back */}
      <ul className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${swipeRowClass()} max-sm:-mb-3 max-sm:mt-5 max-sm:pb-3 max-sm:pt-1`}>
        {cards.map((hotel, i) => (
          <li key={hotel.id} className={`card-in grid ${swipeItemClass} max-sm:w-[240px]${saveable ? " relative" : ""}`} style={{ "--i": i } as React.CSSProperties}>
            <Card href={hotel.href} padding="none" className="overflow-hidden">
              <HotelPhoto url={hotel.photo} className="aspect-[16/10] w-full rounded-none" />
              <div className="px-5 py-4 sm:px-4 sm:py-3">
                <h3 className="truncate font-serif text-xl leading-7 text-ink">{hotel.name}</h3>
                {hotel.location && <p className="truncate text-sm leading-6 text-slate">{hotel.location}</p>}
              </div>
            </Card>
            {/* Beside the link, not in it: a button can't sit inside a link */}
            {saveable && <SaveHotelButton hotelId={hotel.id} hotelName={hotel.name} saved className="absolute right-3 top-3 z-10" />}
          </li>
        ))}
        {more && (
          <li className={`card-in grid ${swipeItemClass} max-sm:w-[240px]`} style={{ "--i": cards.length } as React.CSSProperties}>
            <Card href={more.href} className="border-dashed">
              <span className="flex h-full min-h-24 items-center justify-center gap-1.5 text-center text-base font-semibold text-blue">
                {more.label}
                <ArrowIcon className={arrowSlideClass} />
              </span>
            </Card>
          </li>
        )}
      </ul>
    </section>
  );
}
