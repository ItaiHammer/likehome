"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { PAGE_ROUTES } from "@/constants/routes";
import { destinationPageCount, destinationPageStart } from "@/lib/destination-pages";
import { readSearchFields, type SearchFields } from "@/lib/recent-searches";
import { searchQuery } from "@/lib/stay-filters";
import { POPULAR_DESTINATIONS, POPULAR_TABS, type DestinationTab } from "../_data/destinations";
import { browserTimeZone } from "./dates";
import { useReducedMotion } from "./motion";
import { iconButton, SectionHeading } from "./ui";
import styles from "./home/HomeLayout.module.css";

const STEP_MS = 3500;

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function searchHref(where: string, tz: string, bar: SearchFields | null) {
  const dates = bar?.checkIn && bar.checkOut ? { checkIn: bar.checkIn, checkOut: bar.checkOut } : {};
  const party = bar ? { adults: String(bar.adults), children: String(bar.children) } : {};
  return `${PAGE_ROUTES.SEARCH}?${searchQuery({ where, ...dates, ...party, tz })}`;
}

/**
 * Destination carousel deliberately uses React page state rather than scrolling
 * a CSS snap track. The previous arrow handler relied on scrollWidth/scrollLeft,
 * which could report the wrong edge after a tab change or a layout animation.
 * This keeps arrows, autoplay and the visible cards in sync at every width.
 */
export function PopularDestinations() {
  const [tab, setTab] = useState<DestinationTab>("near");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [bar, setBar] = useState<SearchFields | null>(null);
  const touchX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const baseId = useId();
  const reduced = useReducedMotion();
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const timeZone = useSyncExternalStore(subscribeVisibility, browserTimeZone, () => "");

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const tablet = window.matchMedia("(min-width: 640px)");
    const update = () => setPerPage(desktop.matches ? 3 : tablet.matches ? 2 : 1);
    update();
    desktop.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const items = POPULAR_DESTINATIONS[tab];
  const pages = destinationPageCount(items.length, perPage);
  const currentPage = Math.min(page, pages - 1);
  const start = destinationPageStart(currentPage, items.length, perPage);
  const shown = items.slice(start, start + perPage);
  const tabIndex = POPULAR_TABS.findIndex((item) => item.id === tab);
  const tabLabel = POPULAR_TABS[tabIndex].label;

  // The only automatically advancing carousel on the homepage. Hover, focus,
  // off-screen position and reduced motion pause it without a separate toggle.
  useEffect(() => {
    if (!inView || hovered || focused || !pageVisible || reduced) return;
    const timer = window.setTimeout(() => {
      if (currentPage < pages - 1) setPage(currentPage + 1);
      else {
        setTab(POPULAR_TABS[(tabIndex + 1) % POPULAR_TABS.length].id);
        setPage(0);
      }
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [inView, hovered, focused, pageVisible, reduced, currentPage, pages, tabIndex]);

  const selectTab = (next: DestinationTab) => {
    setInteracted(true);
    setTab(next);
    setPage(0);
  };

  const move = (direction: -1 | 1) => {
    setInteracted(true);
    setPage((old) => Math.max(0, Math.min(pages - 1, old + direction)));
  };

  const readBar = () => {
    const form = document.querySelector<HTMLFormElement>("form[data-search-bar]");
    if (form) setBar(readSearchFields(new FormData(form)));
  };

  const arrow = (direction: -1 | 1) => (
    <button
      type="button"
      aria-label={direction === -1 ? "Previous destinations" : "Next destinations"}
      aria-controls={`${baseId}-panel`}
      disabled={direction === -1 ? currentPage === 0 : currentPage === pages - 1}
      onClick={() => move(direction)}
      className={`${iconButton} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === -1 ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} />
      </svg>
    </button>
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`${baseId}-title`}
      aria-roledescription="carousel"
      className="isolate"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className={styles.destinationHeader}>
        <SectionHeading id={`${baseId}-title`} title="Find your next escape" />
        <p className={`mt-1 text-base text-slate ${styles.destinationSubtitle}`}>The places guests are booking most, close by, across the country and around the world.</p>
        <div className={`relative z-[1] mt-5 ml-auto flex items-center justify-end ${styles.destinationControls}`}>
          <div role="tablist" aria-label="Destinations" className="inline-flex flex-wrap gap-1 rounded-xl border border-edge bg-surface/90 p-1 shadow-sm">
            {POPULAR_TABS.map((item, i) => (
              <button
                key={item.id}
                id={`${baseId}-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`${baseId}-panel`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => selectTab(item.id)}
                onKeyDown={(event) => {
                  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                  if (!direction) return;
                  event.preventDefault();
                  const next = POPULAR_TABS[(i + direction + POPULAR_TABS.length) % POPULAR_TABS.length];
                  selectTab(next.id);
                  document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
                }}
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${tab === item.id ? "bg-blue/10 text-blue-dark shadow-sm" : "text-slate hover:bg-blue/5 hover:text-ink"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className={`mt-5 ${styles.destinationPanel}`}>
        <ul
          key={`${tab}-${currentPage}-${perPage}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchX.current === null) return;
            const delta = event.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1);
          }}
        >
          {shown.map((place, i) => (
            <li key={place.name} className="tile-in min-w-0" style={{ "--i": i } as CSSProperties}>
              <Link
                href={searchHref(`${place.name}, ${place.region}`, timeZone, bar)}
                prefetch={false}
                onPointerDown={readBar}
                onFocus={readBar}
                className={`theme-fade-keep group block h-full overflow-hidden rounded-lg border border-edge bg-surface text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${styles.destinationTile}`}
                aria-label={`Search stays in ${place.name}, ${place.region}`}
              >
                <div className={`relative aspect-[16/10] overflow-hidden lg:aspect-video ${styles.destinationPhoto}`}>
                  <Image src={place.photo} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" placeholder={typeof place.photo === "string" ? "empty" : "blur"} draggable={false} className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-[#141a45]/30 opacity-0 dark:opacity-100" />
                </div>
                <div className={`flex items-center justify-between gap-3 px-5 py-4 ${styles.destinationCaption}`}>
                  <p className="min-w-0 truncate text-lg font-semibold leading-7 text-ink"><span className="mr-1 text-xs text-slate">#{start + i + 1}</span>{place.name}</p>
                  <p className={`max-w-[55%] truncate text-right text-sm text-slate ${styles.destinationRegion}`}>{place.region}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <nav className="mt-4 flex items-center justify-center gap-4" aria-label={`${tabLabel} destination pages`}>
        {arrow(-1)}
        <span className="sr-only" aria-live="polite">{interacted ? `Page ${currentPage + 1} of ${pages} for ${tabLabel}` : ""}</span>
        {arrow(1)}
      </nav>
    </section>
  );
}
