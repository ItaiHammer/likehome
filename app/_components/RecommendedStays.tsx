import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowIcon, Button, SectionHeading } from "@/app/_components/ui";
import { WindowScene } from "@/app/_components/WindowScene";
import { SearchResultCard } from "@/app/search/components/SearchResultCard";
import { liveRatesEnabled } from "@/lib/liteapi/rates";
import { RECOMMENDED_CARDS, recommendationSubtitle, toRecommendedCards } from "@/lib/recommendations";
import { getRecommendedStays } from "@/utils/recommended-stays";
import { TZ_COOKIE } from "@/utils/tz-cookie";

const TITLE = "Stays that feel like yours";
const TITLE_ID = "recommended-stays-title";

// Cara's recommendations (US 3.3.2): stays near the guest's latest viewed hotel and price range, else their time zone
export async function RecommendedStays() {
  const timeZone = (await cookies()).get(TZ_COOKIE)?.value;

  let result: Awaited<ReturnType<typeof getRecommendedStays>>;
  try {
    result = await getRecommendedStays(timeZone, RECOMMENDED_CARDS);
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

  const cards = toRecommendedCards(output.results.data, liveRatesEnabled());
  const moreHref = `/search?${new URLSearchParams({ where: place.where })}`;

  return (
    <section id="stays" aria-labelledby={TITLE_ID} className="scroll-mt-6">
      <SectionHeading
        id={TITLE_ID}
        title={TITLE}
        subtitle={recommendationSubtitle(place)}
        action={
          cards.length > 0 && (
            <Link href={moreHref} className="group inline-flex shrink-0 items-center gap-1.5 text-base font-semibold text-blue hover:text-blue-dark">
              More stays in {place.city}
              <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          )
        }
      />
      {cards.length > 0 ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((stay, i) => (
            <li key={stay.id ?? stay.liteapi_id ?? i} className="card-in grid" style={{ "--i": i } as React.CSSProperties}>
              <SearchResultCard stay={stay} headingLevel="h3" eager={i < 3} />
            </li>
          ))}
        </ul>
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
export function RecommendedStaysSkeleton() {
  const block = "rounded-lg bg-disabled";
  return (
    <section id="stays" aria-busy="true" aria-labelledby={TITLE_ID} className="scroll-mt-6">
      <SectionHeading id={TITLE_ID} title={TITLE} />
      <p role="status" className="sr-only">
        Loading stays…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className={`mt-1 h-6 w-96 max-w-full ${block}`} />
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: RECOMMENDED_CARDS }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-2xl border border-edge bg-surface">
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
