import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowIcon, arrowSlideClass, Button, SectionHeading, sectionLinkClass, swipeItemClass, swipeRowClass } from "@/app/_components/ui";
import { WindowScene } from "@/app/_components/WindowScene";
import { SearchResultCard } from "@/app/search/components/SearchResultCard";
import { liveRatesEnabled } from "@/lib/liteapi/rates";
import { RECOMMENDED_CARDS, recommendationSubtitle, toRecommendedCards } from "@/lib/recommendations";
import { getRecommendedStays } from "@/utils/recommended-stays";
import { TZ_COOKIE } from "@/utils/tz-cookie";
import { getViewer } from "@/utils/viewer";
import { RecommendedCarousel } from "./RecommendedCarousel";
import styles from "./home/HomeLayout.module.css";

const TITLE = "Stays that feel like yours";
const TITLE_ID = "recommended-stays-title";

// From sm up, the grid; on phones, the shared swipe row of 280px cards
const GRID = "mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
const CARD_WIDTH = "max-sm:w-[280px]";

// Cara's recommendations (US 3.3.2): stays near the guest's latest viewed hotel and price range, else their time zone
export async function RecommendedStays({ title = TITLE, excludeStayId, count = RECOMMENDED_CARDS }: { title?: string; excludeStayId?: string; count?: number } = {}) {
  const timeZone = (await cookies()).get(TZ_COOKIE)?.value;
  const { role } = await getViewer();

  let result: Awaited<ReturnType<typeof getRecommendedStays>>;
  try {
    result = await getRecommendedStays(timeZone, count);
  } catch (error) {
    console.error("Recommended stays failed", error);
    return null;
  }
  const { place, output } = result;
  // An optional section: a failed search hides it rather than breaking the home page
  if (output.results.error) {
    console.error("Recommended stays search failed", output.results.error);
    return null;
  }

  const cards = toRecommendedCards(output.results.data, liveRatesEnabled(), count).filter(
    (card) => !excludeStayId || (card.id !== excludeStayId && card.liteapi_id !== excludeStayId)
  );
  const moreHref = `/search?${new URLSearchParams({ where: place.where })}`;

  return (
    <section id="stays" aria-labelledby={TITLE_ID} className={`scroll-mt-6 ${styles.stays}`}>
      <SectionHeading
        id={TITLE_ID}
        title={title}
        subtitle={recommendationSubtitle(place)}
        action={
          cards.length > 0 && (
            <Link href={moreHref} className={sectionLinkClass}>
              More stays in {place.city}
              <ArrowIcon className={arrowSlideClass} />
            </Link>
          )
        }
      />
      {cards.length > 0 ? (
        <RecommendedCarousel>
          {cards.map((stay, i) => (
            <li key={stay.id ?? stay.liteapi_id ?? i} className="card-in min-w-0" style={{ "--i": i } as React.CSSProperties}>
              <SearchResultCard stay={stay} headingLevel="h3" eager={i < 3} businessAccount={role === "business"} compactOnPhones />
            </li>
          ))}
        </RecommendedCarousel>
      ) : (
        <NoRecommendations city={place.city} />
      )}
    </section>
  );
}

function NoRecommendations({ city }: { city: string }) {
  return (
    <div className="mt-6 grid overflow-hidden rounded-lg border border-edge bg-surface md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="p-8 sm:p-10">
        <h3 className="font-serif text-[32px] leading-[40px] text-ink">Nothing to suggest just yet.</h3>
        <p className="mt-3 max-w-md leading-7 text-slate">We couldn’t find stays in {city} to suggest right now. Search anywhere to find your next place.</p>
        <Button href="/search" className="mt-6">
          Browse stays
        </Button>
      </div>
      <div className="hidden border-l border-edge md:block">
        <WindowScene variant="city" id="scene-no-recommendations" />
      </div>
    </div>
  );
}

// Shaped like the cards above, under the real title, so the section doesn't jump when they stream in
export function RecommendedStaysSkeleton({ count = RECOMMENDED_CARDS }: { count?: number }) {
  const block = "rounded-lg bg-disabled";
  return (
    <section id="stays" aria-busy="true" aria-labelledby={TITLE_ID} className={`scroll-mt-6 ${styles.stays}`}>
      <SectionHeading id={TITLE_ID} title={TITLE} />
      <p role="status" className="sr-only">
        Loading stays…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className={`mt-1 h-6 w-96 max-w-full ${block}`} />
        {/* Clipped, not scrollable, on phones: nothing in it can take focus, and it's hidden from screen readers */}
        <ul className={`${GRID} ${swipeRowClass(false)}`}>
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className={`overflow-hidden rounded-2xl border border-edge bg-surface ${swipeItemClass} ${CARD_WIDTH}`}>
              <div className="aspect-[16/10] bg-disabled" />
              <div className="p-5">
                <div className={`h-6 w-2/3 ${block}`} />
                <div className={`mt-2 h-4 w-1/2 ${block}`} />
                <div className={`mt-5 h-4 w-full ${block}`} />
                <div className={`mt-2 h-4 w-5/6 ${block}`} />
                <div className="mt-5 border-t border-edge pt-4">
                  <div className={`h-7 w-24 ${block}`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
