"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { POPULAR_DESTINATIONS, POPULAR_TABS, type DestinationScene, type DestinationTab, type PopularDestination } from "../_data/destinations";
import { isMotionReduced, useReducedMotion } from "./motion";
import { buttonPrimary, buttonSecondary, iconButton } from "./ui";

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

/*
 * "Popular destinations": tabs for near / national / international, each a
 * swipeable carousel of ranked, illustrated tiles.
 *
 * Autoplay: every STEP_MS it moves one tile along; once it reaches the end it
 * switches to the next tab. It pauses while hovered or off screen, stops for
 * good when someone uses the keyboard inside it or presses pause, and doesn't
 * start at all when motion is reduced.
 *
 * Choosing a tile fills the search bar's destination (DestinationInput listens
 * for the event) and scrolls back up to it.
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
  const reduced = useReducedMotion();
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
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

  function pick(d: PopularDestination) {
    window.dispatchEvent(new CustomEvent("likehome:destination", { detail: `${d.name}, ${d.region}` }));
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  // Card tilt: the side under the cursor presses away, up to ~7° each way.
  // Mouse and pen only; off when motion is reduced.
  function tilt(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === "touch" || isMotionReduced()) return;
    if (drag.current?.moved) return untilt(e);
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((px - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 12).toFixed(2)}deg`);
  }

  function untilt(e: React.PointerEvent<HTMLButtonElement>) {
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

  return (
    <section
      ref={sectionRef}
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
      <h2 id={`${baseId}-title`} className="font-serif text-[40px] leading-[48px] text-ink">
        Popular destinations
      </h2>
      <p className="mt-1 text-base text-slate">The places guests are booking most, close by, across the country and around the world.</p>

      {/* relative z-[1]: stays clickable above the track's top bleed padding */}
      <div className="relative z-[1] mt-5 flex flex-wrap items-center justify-between gap-3">
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
                className={selected ? `${buttonPrimary} border border-blue` : buttonSecondary}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => page(-1)}
            aria-disabled={edges.start}
            aria-label="Previous destinations"
            aria-controls={`${baseId}-track`}
            className={`${iconButton} ${arrowInactive}`}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12.5 4.5L7 10l5.5 5.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            aria-disabled={edges.end}
            aria-label="Next destinations"
            aria-controls={`${baseId}-track`}
            className={`${iconButton} ${arrowInactive}`}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7.5 4.5L13 10l-5.5 5.5" />
            </svg>
          </button>
        </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="mt-5">
        {/* Keyed by tab: switching starts at the first tile and replays the entrance.
            The padding (cancelled by negative margin) leaves room for the hover pop:
            a little on top, more below for its shadow; the sideways bleed lets
            tiles slide to the edge. Mouse users can drag it; touch swipes natively. */}
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
          onFocus={() => setFocusInTrack(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocusInTrack(false)}
          className={`relative -mx-4 -mb-16 -mt-6 flex select-none gap-4 overflow-x-auto scroll-px-4 px-4 pb-16 pt-6 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden ${
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
              className="relative w-[80%] shrink-0 snap-start hover:z-10 focus-within:z-10 sm:w-[46%] lg:w-[31%]"
            >
              <div
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}`}
                className="tile-in h-full"
                style={{ "--i": i } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => pick(d)}
                  onPointerMove={tilt}
                  onPointerLeave={untilt}
                  aria-label={`Search stays in ${d.name}, ${d.region}`}
                  className={`tilt theme-fade-keep group relative block h-80 w-full overflow-hidden rounded-lg border border-edge text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:h-96 lg:h-[420px] ${
                    dragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                >
                  <div
                    className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    style={{ background: `linear-gradient(160deg, ${d.colors[0]}, ${d.colors[1]})` }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
                    <Scene kind={d.scene} />
                  </div>
                  {/* Night: the tile dims with the theme */}
                  <div className="absolute inset-0 bg-[#141a45]/45 opacity-0 dark:opacity-100" />
                  {/* Ink fade behind the caption: it eases in across the 112px top padding,
                      then stays at 66%+ under every line of text (however many lines the
                      name wraps to), so the white text clears 4.5:1 (3:1 for the city name)
                      even if the illustration under it were pure white. */}
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_bottom,rgb(7_13_47/0)_0,rgb(7_13_47/0.1)_28px,rgb(7_13_47/0.33)_56px,rgb(7_13_47/0.56)_84px,rgb(7_13_47/0.66)_112px,rgb(7_13_47/0.7))] p-5 pt-28 sm:p-6 sm:pt-28">
                    <p className="text-sm font-semibold text-white/85">#{i + 1}</p>
                    <p className="font-serif text-[32px] leading-[38px] text-white">{d.name}</p>
                    <p className="truncate text-sm text-white/80">{d.region}</p>
                  </div>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom row: a small pause/play button beside the position dots.
          relative z-[1] keeps it clickable above the track's bottom bleed padding. */}
      <div className="relative z-[1] mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            restartCountdown();
            setAutoplayChoice(!autoplay);
          }}
          aria-label={autoplay ? "Pause the carousel" : "Play the carousel"}
          title={autoplay ? "Pause" : "Play"}
          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-ink transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
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
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </section>
  );
}

// Soft translucent landscape along the bottom of a tile; works over any tile color.
function Scene({ kind }: { kind: DestinationScene }) {
  const light = "rgba(255,255,255,0.4)";
  const faint = "rgba(255,255,255,0.25)";
  const shade = "rgba(34,44,100,0.2)";
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[70%] w-full" aria-hidden>
      {kind === "coast" && (
        <>
          <rect x="0" y="120" width="400" height="80" fill={faint} />
          <path d="M40 142 h36 M150 158 h44 M250 138 h30" stroke={light} strokeWidth="3" strokeLinecap="round" />
          <path d="M270 200 V96 Q300 70 340 84 L400 76 V200 Z" fill={shade} />
          <rect x="318" y="70" width="18" height="14" fill={light} />
          <path d="M314 72 L327 62 L340 72 Z" fill={light} />
        </>
      )}
      {kind === "lake" && (
        <>
          <path d="M0 120 L70 64 L130 104 L200 50 L280 110 L340 76 L400 112 V200 H0 Z" fill={shade} />
          <path d="M0 132 Q200 118 400 132 V200 H0 Z" fill={faint} />
          <path d="M60 150 h60 M220 160 h70" stroke={light} strokeWidth="3" strokeLinecap="round" />
          {[24, 48, 352, 376].map((x, i) => (
            <path key={x} d={`M${x} ${i % 2 ? 190 : 184} l14 -48 l14 48 z`} fill="rgba(34,44,100,0.28)" />
          ))}
        </>
      )}
      {kind === "beach" && (
        <>
          <circle cx="300" cy="70" r="26" fill="rgba(255,255,255,0.55)" />
          <rect x="0" y="112" width="400" height="50" fill={faint} />
          <path d="M0 150 Q120 138 240 150 T400 146 V200 H0 Z" fill="rgba(255,255,255,0.45)" />
          <path d="M92 174 Q96 132 104 112" stroke="rgba(34,44,100,0.3)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M104 112 q-22 -4 -34 8 M104 112 q20 -8 34 4 M104 112 q-8 -18 -24 -20 M104 112 q10 -16 26 -16" stroke="rgba(34,44,100,0.3)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
      {kind === "mountain" && (
        <>
          <path d="M0 150 L110 44 L170 104 L250 30 L400 150 V200 H0 Z" fill={shade} />
          <path d="M110 44 L90 64 L106 58 L118 68 L128 62 Z M250 30 L226 54 L244 48 L258 60 L272 50 Z" fill="rgba(255,255,255,0.7)" />
          <path d="M0 160 Q140 128 280 150 T400 144 V200 H0 Z" fill={faint} />
        </>
      )}
      {kind === "city" && (
        <>
          {[
            [16, 96, 40],
            [62, 64, 34],
            [102, 110, 46],
            [154, 44, 30],
            [190, 84, 44],
            [240, 58, 36],
            [282, 100, 48],
            [336, 72, 44],
          ].map(([x, y, w]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={200 - y} fill={shade} />
              {[0, 1, 2].map((r) => (
                <rect key={r} x={x + 8} y={y + 12 + r * 22} width={w - 16} height="6" fill={faint} />
              ))}
            </g>
          ))}
          <rect x="0" y="176" width="400" height="24" fill={faint} />
        </>
      )}
    </svg>
  );
}
