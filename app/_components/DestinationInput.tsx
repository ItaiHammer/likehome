"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadRecentSearches, searchDetails, type RecentSearch } from "@/lib/recent-searches";
import { DESTINATIONS } from "../_data/destinations";
import { todayISO } from "./dates";
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
const wordsOf = (s: string) => norm(s).split(/[\s,.'-]+/);

const INDEX = DESTINATIONS.map(([name, region], rank) => ({
  name,
  region,
  rank,
  key: norm(name),
  words: wordsOf(name),
  regionKey: norm(region),
  // The text a picked destination leaves in the field, e.g. "paris, france"
  full: norm(`${name}, ${region}`),
}));

type Result = (typeof INDEX)[number];

/** A suggestion; `placeId` marks one of LiteAPI's places */
type Option = { key: string; name: string; region: string; placeId?: string };

type RemotePlace = { placeId: string; name: string; region: string };

/** A row in the list: one of the guest's recent searches, or a place */
type Item = { kind: "recent"; key: string; search: RecentSearch } | { kind: "place"; key: string; option: Option };

// A recent search shows while the field is empty, or when its place (or a word in it) starts with what's typed
function matchesRecent(where: string, query: string) {
  const q = norm(query.trim());
  return !q || norm(where).startsWith(q) || wordsOf(where).some((w) => w.startsWith(q));
}

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

function ClockIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

// Destination field: instant suggestions from a bundled list, then LiteAPI's places (any town, airport or landmark)
// after a typing pause. Picking one of LiteAPI's sends its place id with the search. With `onPickRecent`, the
// guest's recent searches (kept in this browser) come first; picking one fills this field and hands the
// search over so the bar can fill its dates and guests.
export function DestinationInput({
  className = "",
  initialValue = "",
  initialPlace = "",
  autoFocusFrom,
  onPickRecent,
}: {
  className?: string;
  initialValue?: string;
  initialPlace?: string;
  /** Focus the field when it mounts, e.g. back from AI search; "pointer" keeps the keyboard ring off */
  autoFocusFrom?: "keyboard" | "pointer";
  onPickRecent?: (search: RecentSearch) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  // The last place filled in by picking (a suggestion or a recent search)
  const [picked, setPicked] = useState(initialValue);
  // LiteAPI's id for the picked place; typing anything else clears it
  const [placeId, setPlaceId] = useState(initialPlace);
  const [remote, setRemote] = useState<{ query: string; places: RemotePlace[] }>({ query: "", places: [] });
  // Read from the browser each time the list opens, never while rendering, so the server's HTML always matches
  const [recents, setRecents] = useState<RecentSearch[]>([]);
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
  const recentItems = useMemo<Item[]>(
    () => recents.filter((r) => matchesRecent(r.where, query)).map((r, i) => ({ kind: "recent", key: `recent-${i}`, search: r })),
    [recents, query],
  );
  const items = useMemo<Item[]>(
    () => [...recentItems, ...options.map((option): Item => ({ kind: "place", key: option.key, option }))],
    [recentItems, options],
  );

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

  // "No matches" is for typing, once LiteAPI has answered too; a picked place that isn't in the
  // suggestion list (a recent search for what someone typed) just closes the list instead
  const showNoMatches = trimmed !== "" && items.length === 0 && query !== picked && remote.query === trimmed;
  const open = focused && (items.length > 0 || showNoMatches);
  const placesHeading = !trimmed ? "Popular destinations" : recentItems.length ? "Suggestions" : "";

  function openList() {
    setFocused(true);
    if (onPickRecent) setRecents(loadRecentSearches(todayISO()));
  }

  function choose(item: Item) {
    const place =
      item.kind === "recent" ? item.search.where : item.option.region ? `${item.option.name}, ${item.option.region}` : item.option.name;
    setQuery(place);
    setPicked(place);
    setPlaceId((item.kind === "recent" ? item.search.place : item.option.placeId) ?? "");
    setFocused(false);
    setActive(-1);
    if (item.kind === "recent") onPickRecent?.(item.search);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!focused) return openList();
      const n = items.length;
      if (!n) return;
      const down = e.key === "ArrowDown";
      // From nothing selected: Down goes to the first result, Up to the last
      setActive((i) => (i < 0 ? (down ? 0 : n - 1) : (i + (down ? 1 : -1) + n) % n));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  const headingClass = "cascade px-3 pb-1 pt-2 text-sm font-semibold text-slate";
  // Cascade order of the places' heading, after the recent searches and theirs
  const placesStart = recentItems.length ? recentItems.length + 1 : 0;
  const renderItem = (item: Item, i: number, order: number) => (
    <li
      key={item.key}
      id={`${listId}-${i}`}
      role="option"
      aria-selected={i === active}
      onClick={() => choose(item)}
      onMouseEnter={() => setActive(i)}
      style={{ "--i": order } as React.CSSProperties}
      className={`cascade flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-blue/10" : ""}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
        {item.kind === "recent" ? <ClockIcon className="h-4 w-4" /> : <PinIcon className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-medium text-ink">
          <Highlight text={item.kind === "recent" ? item.search.where : item.option.name} query={query} />
        </span>
        <span className="block truncate text-sm text-slate">
          {item.kind === "recent" ? searchDetails(item.search) : item.option.region}
        </span>
      </span>
    </li>
  );

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
        openList();
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
          onFocus={openList}
          onPointerDown={() => setPointerFocus(true)}
          // Clicking the field again (it keeps focus after a pick) reopens the list
          onClick={openList}
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
        {/* Keep focus in the input so the list doesn't close before a click lands */}
        <div role="listbox" id={listId} aria-label="Destinations" onPointerDown={(e) => e.preventDefault()}>
          {recentItems.length > 0 && (
            <ul role="group" aria-labelledby={`${listId}-recent`}>
              <li role="presentation" id={`${listId}-recent`} className={headingClass}>
                Recent searches
              </li>
              {recentItems.map((item, i) => renderItem(item, i, 1 + i))}
            </ul>
          )}
          {options.length > 0 && (
            <ul
              role="group"
              aria-labelledby={placesHeading ? `${listId}-places` : undefined}
              aria-label={placesHeading ? undefined : "Suggestions"}
            >
              {placesHeading && (
                <li
                  role="presentation"
                  id={`${listId}-places`}
                  className={headingClass}
                  style={{ "--i": placesStart } as React.CSSProperties}
                >
                  {placesHeading}
                </li>
              )}
              {items.slice(recentItems.length).map((item, i) => renderItem(item, recentItems.length + i, placesStart + 1 + i))}
            </ul>
          )}
        </div>
        {showNoMatches && (
          <p className="px-3 py-3 text-sm text-slate">No matches yet. Try a city, region or country.</p>
        )}
      </div>
    </div>
  );
}
