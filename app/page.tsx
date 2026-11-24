import { Fragment, Suspense } from "react";
import BlurText from "./_components/BlurText";
import { JoinCard } from "./_components/home/JoinCard";
import { OwnerProperties, OwnerPropertiesSkeleton } from "./_components/home/OwnerProperties";
import { OwnerStats } from "./_components/home/OwnerStats";
import { OwnerToday } from "./_components/home/OwnerToday";
import { OwnerWeek, OwnerWeekSkeleton } from "./_components/home/OwnerWeek";
import { SavedHotels } from "./_components/home/SavedHotels";
import { HomeSky } from "./_components/home/HomeSky";
import { TravelOverview, TravelWelcome } from "./_components/home/TravelHome";
import { PopularDestinations } from "./_components/PopularDestinations";
import { RecentlyViewed } from "./_components/RecentlyViewed";
import { RecommendedStays, RecommendedStaysSkeleton } from "./_components/RecommendedStays";
import { SearchExperience } from "./_components/SearchExperience";
import { redirect } from "next/navigation";
import { choicePathFor } from "@/lib/account/choice";
import { homeContentFor, SHARED_SECTIONS, type HomeSection } from "@/lib/account/home";
import { getViewer } from "@/utils/viewer";
import styles from "./_components/home/HomeLayout.module.css";

export default async function Home() {
  const viewer = await getViewer();
  if (viewer.role === "unchosen") redirect(choicePathFor(null));
  const { hero, welcome, recommendedCards, sections } = homeContentFor(viewer.role);
  const personal = viewer.role === "personal";
  const orderedSections = personal ? sections.filter((id) => id !== "destinations") : sections;

  // Each section that reads data streams in on its own, so the hero never waits for it
  const sectionContent: Record<HomeSection, React.ReactNode> = {
    join: <JoinCard />,
    "traveler-summary":
      viewer.userId && welcome ? (
        <TravelOverview accountId={viewer.userId} shortcuts={welcome.shortcuts} />
      ) : null,
    "owner-today": welcome ? <OwnerToday title={welcome.title} body={welcome.body} shortcuts={welcome.shortcuts} /> : null,
    "owner-week": viewer.userId ? (
      <Suspense fallback={<OwnerWeekSkeleton />}>
        <OwnerWeek ownerId={viewer.userId} />
      </Suspense>
    ) : null,
    "owner-properties": viewer.userId ? (
      <Suspense fallback={<OwnerPropertiesSkeleton />}>
        <OwnerProperties ownerId={viewer.userId} />
      </Suspense>
    ) : null,
    // No placeholder: the section hides itself for an owner with no listings
    "owner-stats": (
      <Suspense fallback={null}>
        <OwnerStats />
      </Suspense>
    ),
    "recently-viewed": viewer.userId ? (
      <Suspense fallback={null}>
        <RecentlyViewed accountId={viewer.userId} />
      </Suspense>
    ) : null,
    "saved-hotels": viewer.userId ? (
      <Suspense fallback={null}>
        <SavedHotels accountId={viewer.userId} />
      </Suspense>
    ) : null,
    // Recommended stays (US 3.3), for every role
    recommended: (
      <Suspense fallback={<RecommendedStaysSkeleton count={recommendedCards} />}>
        <RecommendedStays count={recommendedCards} />
      </Suspense>
    ),
    destinations: <PopularDestinations />,
  };

  return (
    <main className={`flex flex-1 flex-col ${personal ? styles.personal : ""}`}>
      <div className={personal ? styles.opening : undefined}>
      {/* Hero: z-20 so the search bar's dropdowns open over the sections below. Popular
          destinations is isolated too, so its hovered tile's z-10 stays inside the carousel */}
      <section className={`relative isolate z-20 px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14 ${styles.hero}`}>
        {/* The sky fades out toward the bottom, into the page background (either theme) */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <HomeSky />
        </div>
        <div className="mx-auto max-w-6xl">
          <BlurText
            as="h1"
            text={personal ? "Welcome back. Where to next?" : hero.title}
            delay={120}
            stepDuration={1}
            // transform, not y: motion runs it as a browser animation, so it doesn't stutter while the page loads
            animationFrom={{ filter: "blur(8px)", opacity: 0, transform: "translateY(10px)" }}
            animationTo={[{ filter: "blur(0px)", opacity: 1, transform: "translateY(0px)" }]}
            easing={[0.33, 1, 0.68, 1]}
            className={`justify-center text-center font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px] ${styles.title}`}
          />
          <p className={`mx-auto mt-3 max-w-xl text-center text-xl leading-7 text-ink ${styles.subtitle}`}>{hero.line}</p>

          {/* Mykaela's search bar (fields, filters, AI mode): it sends people to /search */}
          <div className={`mx-auto mt-10 max-w-5xl ${styles.search}`}>
            <SearchExperience presentation="home" />
          </div>
        </div>
      </section>
      {personal && welcome && (
        <div className={`mx-auto flex w-full max-w-[1360px] flex-col gap-12 px-4 sm:px-6 ${styles.intro}`}>
          <TravelWelcome title={welcome.title} body={welcome.body} />
          {sectionContent.destinations}
        </div>
      )}
      </div>

      <div className={`mx-auto flex w-full ${personal ? "max-w-[1360px]" : "max-w-6xl"} flex-col gap-12 px-4 pb-12 sm:px-6 ${personal ? `pt-12 ${styles.content}` : ""}`}>
        {orderedSections.map((id, i) => (
          <Fragment key={id}>
            {/* The viewer's own sections are above the line, what everyone sees is below */}
            {id === SHARED_SECTIONS[0] && i > 0 && <hr className="border-0 border-t border-edge" />}
            {sectionContent[id]}
          </Fragment>
        ))}
      </div>
    </main>
  );
}
