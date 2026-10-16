"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DESTINATIONS } from "../_data/destinations";
import { RotatingPlaceholder } from "./placeholders";

const MAX_RESULTS = 7;
// Typing pause before asking LiteAPI for places the bundled list doesn't have
const PLACES_DELAY_MS = 250;

// Case- and accent-insensitive: "sao paulo" matches "São Paulo". Letters that
// don't decompose into letter + accent (ø, æ, ß…) are folded by hand, so
// "tromso" finds Tromsø.
const FOLDS: [RegExp, string][] = [[/ø/g, "o"], [/æ/g, "ae"], [/œ/g, "oe"], [/ß/g, "ss"], [/ł/g, "l"], [/đ/g, "d"]];
const norm = (s: string) =>
  FOLDS.reduce((t, [re, to]) => t.replace(re, to), s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase());

const INDEX = DESTINATIONS.map(([name, region], rank) => ({
  name,
  region,
  rank,
  key: norm(name),
  words: norm(name).split(/[\s,.'-]+/),
  regionKey: norm(region),
  // The text a picked destination leaves in the field, e.g. "paris, france"
  full: norm(`${name}, ${region}`),
}));

type Result = (typeof INDEX)[number];

/** A suggestion; `placeId` marks one of LiteAPI's places */
type Option = { key: string; name: string; region: string; placeId?: string };

type RemotePlace = { placeId: string; name: string; region: string };

function search(query: string): Result[] {
  const q = norm(query.trim());
  if (!q) return INDEX.slice(0, 6);
  const scored: [number, Result][] = [];
  for (const d of INDEX) {
    let score: number;
    // A picked "Paris, France" (or the start of one) finds Paris again on reopen
    if (d.key.startsWith(q) || d.full.startsWith(q)) score = 0;
    else if (d.words.some((w) => w.startsWith(q))) score = 1;
    else if (d.regionKey.split(/,\s*/).some((part) => part.startsWith(q))) score = 2;
    else if (`${d.key} ${d.regionKey}`.includes(q)) score = 3;
    else continue;
    scored.push([score, d]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].rank - b[1].rank)
    .slice(0, MAX_RESULTS)
    .map(([, d]) => d);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = norm(query.trim());
  const at = q ? norm(text).indexOf(q) : -1;
  // Only highlight when normalising didn't change the length (true for almost all names)
  if (at < 0 || norm(text).length !== text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-bold text-ink">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

function PinIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

// Destination field: instant suggestions from a bundled list, then LiteAPI's places (any town, airport or landmark)
// after a typing pause. Picking one of LiteAPI's sends its place id with the search.
export function DestinationInput({
  className = "",
  initialValue = "",
  initialPlace = "",
  autoFocusFrom,
}: {
  className?: string;
  initialValue?: string;
  initialPlace?: string;
  /** Focus the field when it mounts, e.g. back from AI search; "pointer" keeps the keyboard ring off */
  autoFocusFrom?: "keyboard" | "pointer";
}) {
  const listId = useId();
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  // The last place filled in by picking (a suggestion or a popular-destination tile)
  const [picked, setPicked] = useState(initialValue);
  // LiteAPI's id for the picked place; typing anything else clears it
  const [placeId, setPlaceId] = useState(initialPlace);
  const [remote, setRemote] = useState<{ query: string; places: RemotePlace[] }>({ query: "", places: [] });
  // Text fields match :focus-visible even when clicked, so the search bar's
  // keyboard focus ring is turned off while the field was focused by mouse or touch
  const [pointerFocus, setPointerFocus] = useState(autoFocusFrom === "pointer");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();
  const options = useMemo<Option[]>(() => {
    const local = search(query);
    const known = new Set(local.map((d) => d.full));
    const places = remote.query === trimmed ? remote.places : [];
    return [
      ...local.map((d) => ({ key: `d${d.rank}`, name: d.name, region: d.region })),
      ...places
        .filter((p) => !known.has(norm(`${p.name}, ${p.region}`)))
        .map((p) => ({ key: p.placeId, name: p.name, region: p.region, placeId: p.placeId })),
    ];
  }, [query, trimmed, remote]);

  useEffect(() => {
    if (trimmed.length < 2 || trimmed === picked.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/places?${new URLSearchParams({ q: trimmed })}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { places: [] }))
        .then((body: { places?: RemotePlace[] }) => setRemote({ query: trimmed, places: Array.isArray(body.places) ? body.places : [] }))
        .catch(() => {});
    }, PLACES_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, picked]);

  // Popular destination tiles fill this field.
  useEffect(() => {
    const onPick = (e: Event) => {
      const place = (e as CustomEvent<string>).detail;
      setQuery(place);
      setPicked(place);
      setPlaceId("");
      setActive(-1);
    };
    window.addEventListener("likehome:destination", onPick);
    return () => window.removeEventListener("likehome:destination", onPick);
  }, []);
  // "No matches" is for typing, once LiteAPI has answered too; a picked place that isn't in the
  // suggestion list (some popular-destination tiles) just closes the list instead
  const showNoMatches = trimmed !== "" && options.length === 0 && query !== picked && remote.query === trimmed;
  const open = focused && (options.length > 0 || showNoMatches);

  function choose(option: Option) {
    const place = option.region ? `${option.name}, ${option.region}` : option.name;
    setQuery(place);
    setPicked(place);
    setPlaceId(option.placeId ?? "");
    setFocused(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!focused) return setFocused(true);
      const n = options.length;
      if (!n) return;
      const down = e.key === "ArrowDown";
      // From nothing selected: Down goes to the first result, Up to the last
      setActive((i) => (i < 0 ? (down ? 0 : n - 1) : (i + (down ? 1 : -1) + n) % n));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div
      className={`relative ${className}`}
      // A press anywhere in the segment (its padding, the pin) goes to the text field,
      // except in the suggestion list, which handles its own clicks
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target === inputRef.current || target.closest('[role="listbox"]')) return;
        e.preventDefault();
        setPointerFocus(true);
        setFocused(true);
        inputRef.current?.focus();
      }}
    >
      <PinIcon className="h-5 w-5 shrink-0 text-slate" />
      {/* The placeholder is drawn over the empty field so it can roll */}
      <span className="relative flex min-w-0 flex-1 items-center">
        <input
          ref={inputRef}
          name="where"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPlaceId("");
            setActive(-1);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onPointerDown={() => setPointerFocus(true)}
          // Clicking the field again (it keeps focus after a pick) reopens the list
          onClick={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setPointerFocus(false);
          }}
          onKeyDown={onKeyDown}
          aria-label="Destination"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={!!autoFocusFrom}
          data-trigger
          data-pointer-focus={pointerFocus || undefined}
          className="w-full min-w-0 bg-transparent text-base text-ink placeholder:text-slate outline-none focus:outline-hidden"
        />
        {!query && (
          <span className="pointer-events-none absolute inset-0 flex items-center">
            <RotatingPlaceholder kind="where" paused={focused} className="w-full text-base text-slate" />
          </span>
        )}
        {placeId && <input type="hidden" name="place" value={placeId} />}
      </span>

      <div
        data-open={open}
        className="dropdown absolute left-0 right-0 top-full z-30 mt-3 rounded-2xl border border-edge bg-surface p-2 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)] md:right-auto md:w-[26rem]"
      >
        {!query.trim() && (
          <p className="cascade px-3 pb-1 pt-2 text-sm font-semibold text-slate">Popular destinations</p>
        )}
        <ul role="listbox" id={listId} aria-label="Destinations">
          {options.map((d, i) => (
            <li
              key={d.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Keep focus in the input so the list doesn't close before the click lands
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(d)}
              onMouseEnter={() => setActive(i)}
              style={{ "--i": i + 1 } as React.CSSProperties}
              className={`cascade flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-blue/10" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                <PinIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-ink">
                  <Highlight text={d.name} query={query} />
                </span>
                <span className="block truncate text-sm text-slate">{d.region}</span>
              </span>
            </li>
          ))}
        </ul>
        {showNoMatches && (
          <p className="px-3 py-3 text-sm text-slate">No matches yet. Try a city, region or country.</p>
        )}
      </div>
    </div>
  );
}
