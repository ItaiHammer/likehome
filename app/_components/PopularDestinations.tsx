"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { PAGE_ROUTES } from "@/constants/routes";
import { readSearchFields, type SearchFields } from "@/lib/recent-searches";
import { searchQuery } from "@/lib/stay-filters";
import { POPULAR_DESTINATIONS, POPULAR_TABS, type DestinationTab } from "../_data/destinations";
import { browserTimeZone } from "./dates";
import { isMotionReduced, useReducedMotion } from "./motion";
import { buttonPrimary, buttonSecondary, iconButton, SectionHeading } from "./ui";
import styles from "./home/HomeLayout.module.css";

const STEP_MS = 3500; // how long the carousel rests on each position before moving on
const RING_R = 12.75; // radius of the countdown ring on the (28px) pause button
const RING = 2 * Math.PI * RING_R;

const scrollBehavior = (): ScrollBehavior => (isMotionReduced() ? "auto" : "smooth");

// Whether the browser tab is in the foreground
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

// Distance from one slide to the next (slide width + gap)
function slideStep(track: HTMLElement) {
  const slides = track.querySelectorAll<HTMLElement>(":scope > li");
  return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
}

// A tile's search: its place, plus the bar's dates (only as a full range) and party
function searchHref(where: string, tz: string, bar: SearchFields | null) {
  const dates = bar?.checkIn && bar.checkOut ? { checkIn: bar.checkIn, checkOut: bar.checkOut } : {};
  const party = bar ? { adults: String(bar.adults), children: String(bar.children) } : {};
  return `${PAGE_ROUTES.SEARCH}?${searchQuery({ where, ...dates, ...party, tz })}`;
}

/*
 * "Find your next escape": tabs for near / national / international, each a
 * swipeable carousel of ranked photo tiles.
 *
 * Autoplay: every STEP_MS it moves one tile along; once it reaches the end it
 * switches to the next tab. It pauses while hovered or off screen, stops for
 * good when someone uses the keyboard inside it or presses pause, and doesn't
 * start at all when motion is reduced.
 *
 * Choosing a tile opens the search results for that place.
 */
export function PopularDestinations() {
  const [tab, setTab] = useState<DestinationTab>("near");
  const [edges, setEdges] = useState({ start: true, end: false });
  const [visible, setVisible] = useState<number[]>([]);
  // null = follow the default (on unless motion is reduced); true/false = the visitor's choice
  const [autoplayChoice, setAutoplayChoice] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  // Focus on a tile pauses autoplay, so tiles never slide out from under focus
  const [focusInTrack, setFocusInTrack] = useState(false);
  // Bumped to restart the countdown after the visitor moves the carousel themselves
  const [countdownId, setCountdownId] = useState(0);
  // Screen-reader position status: silent until the visitor moves the carousel
  const [interacted, setInteracted] = useState(false);
  const [status, setStatus] = useState("");
  // Mouse drag in progress (or its release still settling onto a tile)
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const suppressClick = useRef(false);
  // The page's search bar (if any), read as it reads itself on submit, each time a
  // tile is pressed or focused so the tile's link carries its dates and party
  const [bar, setBar] = useState<SearchFields | null>(null);
  const readBar = () => {
    const form = document.querySelector<HTMLFormElement>("form[data-search-bar]");
    const next = form ? readSearchFields(new FormData(form)) : null;
    setBar((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  };
  const reduced = useReducedMotion();
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  // The search bar's tz, read the same way (empty in the server render); re-read when the tab comes back
  const timeZone = useSyncExternalStore(subscribeVisibility, browserTimeZone, () => "");
  const baseId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  // Countdown to the next move: time left, when that stretch of it started, and
  // whether the visitor just moved the carousel (so the next stretch is a full one)
  const remaining = useRef(STEP_MS);
  const startedAt = useRef(0);
  const restarted = useRef(false);

  const items = POPULAR_DESTINATIONS[tab];
  const tabLabel = POPULAR_TABS.find((t) => t.id === tab)!.label;
  const autoplay = autoplayChoice ?? !reduced;
  const playing = autoplay && !hovered && !focusInTrack && inView && pageVisible;

  // Called for anything the visitor does to the carousel
  const restartCountdown = () => {
    remaining.current = STEP_MS;
    restarted.current = true;
    setCountdownId((n) => n + 1);
    setInteracted(true);
  };

  // A fresh track starts at the first tile; reset in the same update as the tab
  // so the arrows and dots don't show the old track's position for a frame.
  const resetTrackState = () => {
    setEdges({ start: true, end: false });
    setVisible([]);
  };

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
  }, []);

  // Per tab: keep the arrows' enabled state and the dots in sync with the track
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure); // also fires once right away
    ro.observe(el);
    const shown = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.index);
          if (e.intersectionRatio >= 0.6) shown.add(i);
          else shown.delete(i);
        }
        setVisible([...shown].sort((a, b) => a - b));
      },
      { root: el, threshold: [0, 0.6, 1] }
    );
    el.querySelectorAll(":scope > li").forEach((li) => io.observe(li));
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [tab, measure]);

  // Only autoplay while at least a third of the section is on screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One step of autoplay: next tile, or the next tab once the end is showing
  const advance = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
      setEdges({ start: true, end: false });
      setVisible([]);
      setTab((t) => POPULAR_TABS[(POPULAR_TABS.findIndex((x) => x.id === t) + 1) % POPULAR_TABS.length].id);
    } else {
      el.scrollBy({ left: slideStep(el), behavior: scrollBehavior() });
    }
  }, []);

  // Autoplay clock. A timeout does the moving (real time, however often the page
  // repaints); animation frames only draw the countdown ring. Pausing banks the
  // time left, so resuming picks up where it stopped.
  useEffect(() => {
    const ring = ringRef.current;
    if (!playing) return;
    restarted.current = false;
    let timer = 0;
    let raf = 0;
    const schedule = () => {
      startedAt.current = performance.now();
      timer = window.setTimeout(() => {
        remaining.current = STEP_MS;
        advance();
        schedule();
      }, remaining.current);
    };
    const drawRing = () => {
      const left = Math.max(0, remaining.current - (performance.now() - startedAt.current));
      ring?.style.setProperty("stroke-dashoffset", String(RING * (left / STEP_MS)));
      raf = requestAnimationFrame(drawRing);
    };
    schedule();
    raf = requestAnimationFrame(drawRing);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      // Bank the time left, unless a restart just asked for a full countdown
      if (!restarted.current) remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    };
  }, [playing, advance, countdownId]);

  // Position status for screen readers: once the visitor has moved the carousel
  // and it's not autoplaying, announce where it settled (after the scroll stops,
  // not at every step of a smooth scroll)
  useEffect(() => {
    const text =
      interacted && !playing && visible.length
        ? `Showing ${visible[0] + 1} to ${visible[visible.length - 1] + 1} of ${items.length} ${tabLabel.toLowerCase()} destinations`
        : "";
    const t = window.setTimeout(() => setStatus(text), 400);
    return () => window.clearTimeout(t);
  }, [interacted, playing, visible, items.length, tabLabel]);

  function selectTab(id: DestinationTab) {
    restartCountdown();
    if (id !== tab) resetTrackState();
    setTab(id);
  }

  // Arrows move a whole view's worth of tiles. At either end the arrow stays
  // focusable (aria-disabled, not disabled) so keyboard focus isn't dropped.
  function page(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el || (dir < 0 ? edges.start : edges.end)) return;
    restartCountdown();
    const step = slideStep(el);
    const perView = Math.max(1, Math.floor((el.clientWidth + 1) / step));
    el.scrollBy({ left: dir * perView * step, behavior: scrollBehavior() });
  }

  function goTo(i: number) {
    const el = trackRef.current;
    const slides = el?.querySelectorAll<HTMLElement>(":scope > li");
    if (!el || !slides?.length) return;
    restartCountdown();
    el.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: scrollBehavior() });
  }

  // Card tilt: the side under the cursor presses away, up to ~7° each way.
  // Mouse and pen only; off when motion is reduced.
  function tilt(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType === "touch" || isMotionReduced()) return;
    if (drag.current?.moved) return untilt(e);
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((px - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 12).toFixed(2)}deg`);
  }

  function untilt(e: React.PointerEvent<HTMLAnchorElement>) {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  }

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = POPULAR_TABS[(i + delta + POPULAR_TABS.length) % POPULAR_TABS.length];
    selectTab(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  }

  // Mouse drag: click and drag the track sideways (touch already swipes natively).
  // Snapping is off while dragging and while the release settles, then back on.
  function onDragStart(e: React.PointerEvent<HTMLUListElement>) {
    restartCountdown();
    suppressClick.current = false;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  }

  function onDragMove(e: React.PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const el = e.currentTarget;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return; // a small wobble is still a click
      d.moved = true;
      try {
        el.setPointerCapture(e.pointerId); // keep dragging when the mouse leaves the track
      } catch {} // the pointer was already released
      setDragging(true);
    }
    el.scrollLeft = d.left - dx;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientX - d.lastX) / dt; // px per ms, for the fling
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  }

  function onDragEnd(e: React.PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return;
    suppressClick.current = true; // the click that ends a drag shouldn't open a tile
    const el = e.currentTarget;
    // Fling: carry on a little in the drag direction (at most a screenful, and not
    // at all if the mouse stopped before letting go), then settle on the nearest tile
    const step = slideStep(el);
    const max = el.scrollWidth - el.clientWidth;
    const v = e.timeStamp - d.lastT > 80 ? 0 : d.v;
    const fling = Math.max(-el.clientWidth, Math.min(el.clientWidth, -v * 200));
    const to = Math.max(0, Math.min(max, Math.round((el.scrollLeft + fling) / step) * step));
    const done = () => setDragging(false);
    if (Math.abs(el.scrollLeft - to) < 1) return done();
    const hasScrollEnd = "onscrollend" in document.documentElement;
    if (hasScrollEnd) el.addEventListener("scrollend", done, { once: true });
    else window.setTimeout(done, 900); // older Safari: no scrollend event
    el.scrollTo({ left: to, behavior: scrollBehavior() });
  }

  // Arrow look when inactive (mirrors iconButton's disabled: styles)
  const arrowInactive =
    "aria-disabled:cursor-not-allowed aria-disabled:border-disabled aria-disabled:bg-disabled aria-disabled:text-slate aria-disabled:hover:border-disabled";

  // Rendered twice: beside the tabs from sm up, either side of the dots on phones
  const arrow = (dir: 1 | -1, className = "") => (
    <button
      type="button"
      onClick={() => page(dir)}
      aria-disabled={dir < 0 ? edges.start : edges.end}
      aria-label={dir < 0 ? "Previous destinations" : "Next destinations"}
      aria-controls={`${baseId}-track`}
      className={`${iconButton} ${arrowInactive} ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} />
      </svg>
    </button>
  );

  return (
    <section
      ref={sectionRef}
      // isolate: a hovered tile's z-10 only lifts it above its neighbors, never above the page around the carousel
      className="isolate"
      aria-labelledby={`${baseId}-title`}
      aria-roledescription="carousel"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(e) => {
        // Keyboard focus arriving from outside stops autoplay (until Play is pressed).
        // Moving focus around inside doesn't, so Play sticks for keyboard users.
        const from = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(from) && (e.target as HTMLElement).matches(":focus-visible")) setAutoplayChoice(false);
      }}
    >
      <div className={styles.destinationHeader}>
      <SectionHeading
        id={`${baseId}-title`}
        title="Find your next escape"
      />
      <p className={`mt-1 text-base text-slate ${styles.destinationSubtitle}`}>The places guests are booking most, close by, across the country and around the world.</p>

      {/* relative z-[1]: stays clickable above the track's top bleed padding */}
      <div className={`relative z-[1] mt-5 flex flex-wrap items-center justify-between gap-3 ${styles.destinationControls}`}>
        <div role="tablist" aria-label="Destinations" className="flex flex-wrap gap-2">
          {POPULAR_TABS.map((t, i) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                id={`${baseId}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                // Phones: the small size keeps all three tabs on one row
                className={`${selected ? `${buttonPrimary} border border-blue` : buttonSecondary} max-sm:h-9 max-sm:px-4 max-sm:text-sm`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {arrow(-1)}
          {arrow(1)}
        </div>
      </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className={`mt-5 ${styles.destinationPanel}`}>
        {/* Keyed by tab: switching starts at the first tile and replays the entrance.
            The padding (cancelled by negative margin) leaves room for the hover pop:
            a little on top, more below for its shadow; the sideways bleed lets
            tiles slide to the edge. Desktop keeps a card-gap of side padding too,
            so an edge tile can tilt beyond its resting bounds without being clipped.
            Mouse users can drag it; touch swipes natively. */}
        <ul
          key={tab}
          ref={trackRef}
          id={`${baseId}-track`}
          aria-label={`${tabLabel} destinations`}
          onScroll={measure}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onClickCapture={(e) => {
            if (!suppressClick.current) return;
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }}
          onWheel={(e) => Math.abs(e.deltaX) > Math.abs(e.deltaY) && restartCountdown()}
          onFocus={(e) => {
            setFocusInTrack(true);
            // Keyboard only: a mouse press that starts a drag shouldn't pull the track along
            const tile = e.target as HTMLElement;
            if (tile.matches(":focus-visible")) tile.closest("li")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: scrollBehavior() });
          }}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocusInTrack(false)}
          className={`relative -mx-4 -mb-16 -mt-6 flex select-none gap-4 overflow-x-auto scroll-px-4 px-4 pb-16 pt-6 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-4 lg:scroll-px-4 lg:px-4 [&::-webkit-scrollbar]:hidden ${
            dragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x snap-mandatory"
          }`}
        >
          {items.map((d, i) => (
            // Slide: size and snapping. The entrance and the tilt each use
            // transform, so they sit on their own elements inside: a transform on
            // the li itself would shift its snap position (browsers snap to the
            // transformed box, and the entrance starts slightly scaled down).
            <li
              key={d.name}
              data-index={i}
              className="relative w-[80%] shrink-0 snap-start hover:z-10 focus-within:z-10 sm:w-[46%] lg:w-[calc((100%_-_2rem)/3)]"
            >
              <div
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}`}
                className="tile-in h-full"
                style={{ "--i": i } as React.CSSProperties}
              >
                {/* draggable={false}: the browser's own link dragging would cancel the
                    mouse drag-to-scroll. No prefetch: autoplay brings every tile into
                    view, and each one is a dynamic search page. */}
                <Link
                  href={searchHref(`${d.name}, ${d.region}`, timeZone, bar)}
                  prefetch={false}
                  draggable={false}
                  onPointerDown={readBar}
                  onFocus={readBar}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                  aria-label={`Search stays in ${d.name}, ${d.region}`}
                  className={`tilt ${styles.destinationTile} theme-fade-keep group relative block h-full w-full overflow-hidden rounded-lg border border-edge bg-surface text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-blue ${
                    dragging ? "cursor-grabbing" : "cursor-pointer"
                  }`}
                >
                  <div className={`relative aspect-[16/10] overflow-hidden lg:aspect-video ${styles.destinationPhoto}`}>
                    <Image
                      src={d.photo}
                      alt=""
                      fill
                      sizes="(min-width: 1360px) 437px, (min-width: 1024px) 32vw, (min-width: 640px) 46vw, 80vw"
                      placeholder="blur"
                      draggable={false}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[#141a45]/30 opacity-0 dark:opacity-100" />
                  </div>
                  <div className={`px-5 py-4 ${styles.destinationCaption}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-2xl leading-8 text-ink">{d.name}</p>
                      <p className="shrink-0 text-xs font-semibold text-slate">#{i + 1}</p>
                    </div>
                    <p className={`mt-1 truncate text-sm text-slate ${styles.destinationRegion}`}>{d.region}</p>
                  </div>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom row: a small pause/play button beside the position dots, with the
          arrows either side on phones. relative z-[1] keeps it clickable above
          the track's bottom bleed padding. */}
      <div className={`relative z-[1] mt-5 flex items-center justify-between gap-3 sm:justify-center ${styles.destinationFooter}`}>
        {arrow(-1, "sm:hidden")}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              restartCountdown();
              setAutoplayChoice(!autoplay);
            }}
            aria-label={autoplay ? "Pause the carousel" : "Play the carousel"}
            title={autoplay ? "Pause" : "Play"}
            // after: an invisible 44px tap area around the 28px button
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-ink transition-colors after:absolute after:-inset-2 hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            {/* Countdown to the next move */}
            <svg viewBox="0 0 28 28" className={`absolute -inset-px -rotate-90 transition-opacity ${playing ? "opacity-100" : "opacity-0"}`} aria-hidden>
              <circle
                ref={ringRef}
                cx="14"
                cy="14"
                r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING}
                className="text-blue"
              />
            </svg>
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden>
              {autoplay ? <path d="M6 4h3v12H6zM11 4h3v12h-3z" /> : <path d="M6.5 4.2v11.6L15.5 10z" />}
            </svg>
          </button>

          {/* Position: the tiles currently in view are the long dots. Mouse shortcut
              only (they don't take focus); keyboard users have the arrows and can
              tab through the tiles. */}
          <div className="flex gap-1.5" aria-hidden>
            {items.map((d, i) => (
              <button
                key={d.name}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${visible.includes(i) ? "w-6 bg-blue" : "w-2 bg-slate hover:bg-ink"}`}
              />
            ))}
          </div>
        </div>
        {arrow(1, "sm:hidden")}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </section>
  );
}
