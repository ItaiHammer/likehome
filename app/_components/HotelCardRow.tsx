import Link from "next/link";
import { SearchResultCard } from "@/app/search/components/SearchResultCard";
import { SectionHeading, arrowSlideClass, ArrowIcon } from "@/app/_components/ui";
import type { HotelCard } from "@/lib/recently-viewed";
import { RecommendedCarousel } from "./RecommendedCarousel";
import styles from "./home/HomeLayout.module.css";

/** History and saved stays use the same card design as recommendations/search. */
export function HotelCardRow({
  titleId,
  title,
  subtitle,
  action,
  cards,
  saveable = false,
  showFavorites = true,
  carousel = false,
  more,
}: {
  titleId: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  cards: HotelCard[];
  saveable?: boolean;
  showFavorites?: boolean;
  carousel?: boolean;
  more?: { href: string; label: string };
}) {
  const items: React.ReactNode[] = cards.map((hotel) => (
    <li key={hotel.id} className="min-w-0 [&>article]:h-full">
      <SearchResultCard
        stay={{
          id: hotel.id,
          name: hotel.name,
          address: hotel.location,
          description: hotel.description ?? null,
          photo_urls: hotel.photo ? [hotel.photo] : [],
          tags: hotel.tags,
          min_price: hotel.priceFrom,
          max_capacity: hotel.maxCapacity,
          room_options: hotel.roomOptions,
          price_status: hotel.priceFrom == null ? "needs-dates" : undefined,
        }}
        headingLevel="h3"
        initiallySaved={saveable}
        showFavorites={showFavorites}
      />
    </li>
  ));

  if (more) items.push(
    <li key="see-all" className="min-w-0">
      <Link href={more.href} className="flex h-full min-h-56 items-center justify-center gap-2 rounded-2xl border border-dashed border-edge bg-surface p-6 text-center text-base font-semibold text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
        {more.label}<ArrowIcon className={arrowSlideClass} />
      </Link>
    </li>,
  );

  return (
    <section aria-labelledby={titleId} className={styles.hotelRow}>
      <SectionHeading id={titleId} title={title} subtitle={subtitle} action={action} />
      {carousel ? (
        <RecommendedCarousel label={title}>{items}</RecommendedCarousel>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items}</ul>
      )}
    </section>
  );
}
