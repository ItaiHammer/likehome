"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  clearRecentSearches,
  readSearchFields,
  saveRecentSearch,
  searchDetails,
  type RecentSearch,
  type SearchFields,
  type SearchOwner,
} from "@/lib/recent-searches";
import { onAccountChange, whenAccountKnown } from "./accountChange";
import { MAX_PROMPT_CHARS, readAiAnswer } from "./aiSearch";
import { browserTimeZone, todayISO } from "./dates";
import { RotatingPlaceholder } from "./placeholders";
import { DatesField } from "./DatesField";
import { DestinationInput } from "./DestinationInput";
import { GuestsPicker } from "./GuestsPicker";
import { SearchDrift } from "./SearchDrift";
import { SearchFiltersPicker, type SearchFilterValues } from "./SearchFiltersPicker";
import { ChevronIcon } from "./ui";

type SearchMode = "standard" | "ai";

export type SearchInitialValues = SearchFilterValues & {
  where?: string;
  place?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  aiPrompt?: string;
};

// What the dates and guests fields start from. A picked recent search replaces it and bumps `n`,
// which remounts those fields with its values.
type FieldStart = { n: number; checkIn: string; checkOut: string; adults: number; children: number };

const startFrom = (values: SearchInitialValues, n = 0): FieldStart => ({
  n,
  checkIn: values.checkIn ?? "",
  checkOut: values.checkOut ?? "",
  adults: values.adults ?? 2,
  children: values.children ?? 0,
});

const initialFields = (values: SearchInitialValues): SearchFields =>
  readSearchFields({ get: (name) => values[name as keyof SearchInitialValues] });

// Phones: the search bar's fields drop down from a one-line summary. From sm up the panel is
// display: contents, so its rows sit in the form exactly as before; the overrides undo .dropdown's
// hidden state there (it's plain CSS, so they need !important). Its clip-path is dropped while open
// so the fields' own popovers can reach past the panel. Opening it moves focus to the panel, not to Where, so
// the phone keyboard and the place list don't cover the other fields; keyboard users see the ring around it.
const phonePanel =
  "dropdown max-sm:absolute max-sm:inset-x-0 max-sm:top-full max-sm:z-30 max-sm:mt-2.5 max-sm:flex max-sm:flex-col max-sm:gap-3 max-sm:rounded-2xl max-sm:outline-hidden max-sm:focus-visible:outline-solid max-sm:focus-visible:outline-2 max-sm:focus-visible:outline-offset-4 max-sm:focus-visible:outline-blue data-[open=true]:[clip-path:none]! sm:contents sm:visible! sm:pointer-events-auto!";
const phonePanelRow = "cascade sm:opacity-100! sm:transform-none!";
// Phones: the filters control shrinks to its icon (and count) beside Where. This reaches into
// SearchFiltersPicker's trigger, which puts the icon first and its text after it.
const filtersBesideWhere =
  "max-sm:col-start-3 max-sm:row-start-1 max-sm:m-1 max-sm:size-11 max-sm:self-center max-sm:justify-center max-sm:rounded-control max-sm:border max-sm:border-edge max-sm:p-0 max-sm:[&_[data-trigger]]:justify-center max-sm:[&_[data-trigger]>:not(:first-child)]:hidden max-sm:[&_[data-trigger]>:first-child>span]:flex";
// Phones: Where and the filters icon fill the first row, Dates and Guests split the second in half (the 50% column,
// then the rest). Each half's popover reaches across the other half, so it opens at the panel's full width. Guests'
// divider is a pseudo-element, not a border, so both halves stay exactly 50% wide for that reach.
const phoneFieldsGrid = "max-sm:grid-cols-[50%_minmax(0,1fr)_auto]";
const datesHalf = "max-sm:col-start-1 max-sm:[&>[role=dialog]]:-right-full";
const guestsHalf =
  "max-sm:col-span-2 max-sm:before:absolute max-sm:before:inset-y-0 max-sm:before:left-0 max-sm:before:w-px max-sm:before:bg-edge/60 max-sm:[&>[role=dialog]]:-left-full";

function SearchIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3l1.1 3.2L16 7.4l-2.9 1.2L12 12l-1.1-3.4L8 7.4l2.9-1.2L12 3z" strokeLinejoin="round" />
      <path d="M18.2 12.2l.8 2.1 2 .8-2 .8-.8 2.1-.8-2.1-2-.8 2-.8.8-2.1zM5.4 13.5l.7 1.8 1.7.7-1.7.7-.7 1.8-.7-1.8-1.7-.7 1.7-.7.7-1.8z" strokeLinejoin="round" />
    </svg>
  );
}

function AskAiButton({
  onClick,
  stacked = false,
  className,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** The phone bar's narrow version: the label under the icon, always shown */
  stacked?: boolean;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-pressed="false"
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8B5CF6,#4C79BD,#49B6C8,#F09A8A)] p-[3px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${className}`}
      title="Search with AI"
    >
      <span
        className={`flex h-full w-full items-center justify-center rounded-[13px] bg-surface font-semibold text-blue ${stacked ? "flex-col gap-0.5 text-xs" : "gap-2 text-base"}`}
      >
        <SparklesIcon />
        <span className={stacked ? undefined : "lg:sr-only"}>Ask AI</span>
      </span>
    </button>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 7 4 12l5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h8a6 6 0 0 1 6 6" strokeLinecap="round" />
    </svg>
  );
}

export function SearchExperience({
  initialValues = {},
  initialMode = initialValues.aiPrompt ? "ai" : "standard",
  compact = false,
  hideFilters = false,
}: {
  initialValues?: SearchInitialValues;
  initialMode?: SearchMode;
  compact?: boolean;
  hideFilters?: boolean;
}) {
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [fieldStart, setFieldStart] = useState(() => startFrom(initialValues));
  const router = useRouter();

  // The hero's bar folds into one summary button on phones; the compact bar on /search stays as it is
  const collapsible = !compact;
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState(() => initialFields(initialValues));
  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Recent searches belong to the signed-in account (or to signed-out browsing) and are forgotten when it changes.
  // The ref is for the AI search's finish callback, which may hold an older render's values.
  const [searchOwner, setSearchOwner] = useState<SearchOwner>(undefined);
  const searchOwnerRef = useRef<SearchOwner>(undefined);
  useEffect(() => {
    const own = (accountId: string | null) => {
      searchOwnerRef.current = accountId;
      setSearchOwner(accountId);
    };
    const stopKnown = whenAccountKnown(own);
    const stopChange = onAccountChange((accountId) => {
      clearRecentSearches();
      own(accountId);
    });
    return () => {
      stopKnown();
      stopChange();
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    panelRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    // Capture: a field's own popover still reads as open here, and Escape closes just that first
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || panelRef.current?.querySelector('[aria-expanded="true"]')) return;
      if (formRef.current?.contains(document.activeElement)) toggleRef.current?.focus({ preventScroll: true });
      setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [expanded]);

  // The fields keep their own state, so the summary reads the form back once a change has rendered
  const syncSummary = () => {
    if (!collapsible) return;
    requestAnimationFrame(() => {
      if (!formRef.current) return;
      const next = readSearchFields(new FormData(formRef.current));
      setSummary((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    });
  };

  // AI mode: send the prompt to Cara's /api/search/ai endpoint, then open the
  // standard search it describes.
  // Off-topic prompts come back as a reply with no filters, shown under the bar.
  const promptRef = useRef("");
  const [aiNote, setAiNote] = useState("");
  const [aiError, setAiError] = useState("");
  // The AI box rolls through example requests while it's empty
  const [aiText, setAiText] = useState(initialValues.aiPrompt ?? "");
  const [aiFocused, setAiFocused] = useState(false);
  // tz goes with every AI request so the assistant's "today" is the guest's today
  const [transport] = useState(
    () => new DefaultChatTransport({ api: "/api/search/ai", body: () => ({ tz: browserTimeZone() }) }),
  );
  const [aiPointerFocus, setAiPointerFocus] = useState(false);
  // Set by a mode switch, so the newly shown field takes focus (never on page load)
  const [switchedBy, setSwitchedBy] = useState<"keyboard" | "pointer">();
  const { sendMessage, setMessages, status, stop } = useChat({
    transport,
    onFinish: ({ message, isError, isAbort, isDisconnect }) => {
      if (isError || isAbort || isDisconnect) return;
      const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
      const answer = readAiAnswer(text, promptRef.current);
      if (!answer) setAiError("Sorry, that didn't come through. Try asking again.");
      else if (answer.query) {
        saveRecentSearch(readSearchFields(answer.query), todayISO(), searchOwnerRef.current);
        // Same as the standard search bar: send the time zone so date checks use the guest's today
        const tz = browserTimeZone();
        if (tz) answer.query.set("tz", tz);
        router.push(`/search?${answer.query}`);
      }
      else setAiNote(answer.reply || "Tell us where you're going, when, and who's coming.");
    },
    onError: () => setAiError("AI search isn't available right now. Try the standard search instead."),
  });
  const aiBusy = status === "submitted" || status === "streaming";

  // Switching modes starts fresh: no leftover reply or error, and an AI search
  // still running is cancelled so it can't open results after you've left.
  const switchMode = (next: SearchMode, viaPointer: boolean) => {
    if (aiBusy) stop();
    setAiNote("");
    setAiError("");
    // The AI box remounts with its starting text, so match it; the standard fields do too
    setAiText(initialValues.aiPrompt ?? "");
    setFieldStart((s) => startFrom(initialValues, s.n + 1));
    setSummary(initialFields(initialValues));
    setExpanded(false);
    setSwitchedBy(viaPointer ? "pointer" : "keyboard");
    setAiPointerFocus(viaPointer);
    setMode(next);
  };

  const filters: SearchFilterValues = {
    minPrice: initialValues.minPrice,
    maxPrice: initialValues.maxPrice,
    minRating: initialValues.minRating,
    numBeds: initialValues.numBeds,
    bedSize: initialValues.bedSize,
    tags: initialValues.tags,
  };

  const field = compact
    ? "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 md:px-3.5 md:py-3.5 has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:rounded-xl has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-2 has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-inset has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-blue"
    : "flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 md:py-5 has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:rounded-xl has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-2 has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-inset has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-blue";

  // Desktop: a short line centered on each segment's left edge, between the fields
  const divider =
    "md:before:absolute md:before:inset-y-[26%] md:before:left-0 md:before:w-px md:before:bg-edge has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:before:opacity-0";

  const barPadding = compact ? "p-1.5 md:py-0" : "p-2 md:py-0";
  // On tablets Search and Ask AI sit under the fields, so picked dates and the guest count fit in the row
  const searchButtonSize = compact ? "h-12 lg:h-auto lg:w-[56px]" : "h-14 lg:h-auto lg:w-[66px]";
  const toggleSize = compact ? "h-12 lg:h-auto lg:w-[54px]" : "h-14 lg:h-auto lg:w-[58px]";
  // Homepage: once the buttons fit beside the fields, the whole form becomes the white bar with Search and
  // Ask AI inside its right end, so it's one piece centered under the title at any width. The compact bar
  // on /search keeps its buttons outside.
  const barSurface = "rounded-2xl border border-(--bar-edge) bg-surface/80 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md";
  const row = compact
    ? "lg:flex-row"
    : "lg:flex-row lg:gap-2 lg:rounded-2xl lg:border lg:border-(--bar-edge) lg:bg-surface/80 lg:p-2 lg:shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] lg:backdrop-blur-md";
  const barCell = compact ? "" : "lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none";
  const buttonsCell = "lg:contents";
  const insideBar = compact ? "" : "lg:rounded-xl lg:shadow-none";

  // The form still submits as normal (including Apply filters' requestSubmit)
  const rememberSearch = (event: FormEvent<HTMLFormElement>) =>
    saveRecentSearch(readSearchFields(new FormData(event.currentTarget)), todayISO(), searchOwnerRef.current);

  const fillFromRecent = (search: RecentSearch) =>
    setFieldStart((s) => ({
      n: s.n + 1,
      checkIn: search.checkIn ?? "",
      checkOut: search.checkOut ?? "",
      adults: search.adults,
      children: search.children,
    }));

  const submitAiSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = new FormData(event.currentTarget).get("aiPrompt");
    if (typeof prompt !== "string" || !prompt.trim() || aiBusy) return;
    promptRef.current = prompt.trim();
    setAiNote("");
    setAiError("");
    // Each prompt is its own search, not a follow-up in a conversation
    setMessages([]);
    sendMessage({ text: promptRef.current });
  };

  return (
    <SearchDrift>
      {mode === "standard" ? (
        <form
          ref={formRef}
          data-search-bar
          action="/search"
          onSubmit={rememberSearch}
          onInput={syncSummary}
          onClick={syncSummary}
          onKeyUp={syncSummary}
          className={`flex min-w-0 flex-1 flex-col gap-2.5 ${row} ${collapsible ? "max-sm:relative" : ""}`}
        >
          {collapsible && (
            <div className="flex gap-3 sm:hidden">
              <button
                ref={toggleRef}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpanded((open) => !open)}
                // Back from AI search by keyboard; on wider screens it's hidden and Where takes focus instead
                autoFocus={switchedBy === "keyboard"}
                className="flex h-[60px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-(--bar-edge) bg-surface/80 pl-4 pr-3.5 text-left shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue aria-expanded:border-blue"
              >
                <SearchIcon className="h-5 w-5 shrink-0 text-blue" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold leading-5 text-ink">{summary.where || "Where to?"}</span>
                  <span className="block truncate text-sm leading-[18px] text-slate">{searchDetails(summary)}</span>
                </span>
                <ChevronIcon className={`h-5 w-5 shrink-0 text-slate transition ${expanded ? "rotate-180" : ""}`} />
              </button>
              {/* detail is 0 when Enter or Space pressed the button */}
              <AskAiButton stacked onClick={(e) => switchMode("ai", e.detail > 0)} className="h-[60px] w-[68px]" />
            </div>
          )}

          <div
            ref={panelRef}
            id={panelId}
            tabIndex={-1}
            role={collapsible ? "group" : undefined}
            aria-label={collapsible ? "Search for a stay" : undefined}
            data-open={expanded}
            onBlur={(e) => {
              // Tabbing out closes the panel, so it doesn't cover what gets focus next
              if (expanded && e.relatedTarget && !formRef.current?.contains(e.relatedTarget as Node)) setExpanded(false);
            }}
            className={collapsible ? phonePanel : "contents"}
          >
            <div
              style={{ "--i": 0 } as React.CSSProperties}
              className={`grid min-w-0 flex-1 grid-cols-1 divide-y divide-edge/60 ${barSurface} sm:grid-cols-2 sm:divide-y-0 md:flex md:flex-row ${barCell} ${barPadding} ${
                collapsible ? `${phonePanelRow} ${phoneFieldsGrid} max-sm:divide-y-0 max-sm:bg-surface` : ""
              }`}
            >
              <DestinationInput
                className={`${field} sm:col-span-1 sm:border-b sm:border-r sm:border-edge/60 md:flex-[1.45] md:border-0 lg:flex-[1.6] ${
                  collapsible ? "max-sm:col-span-2" : ""
                }`}
                initialValue={initialValues.where ?? ""}
                initialPlace={initialValues.place ?? ""}
                autoFocusFrom={switchedBy === "keyboard" ? "keyboard" : undefined}
                onPickRecent={fillFromRecent}
                recentsOwner={searchOwner}
              />
              <DatesField
                key={`dates-${fieldStart.n}`}
                className={`${field} ${divider} sm:col-span-1 sm:border-b sm:border-edge/60 md:flex-[1.15] md:border-0 ${
                  collapsible ? `${datesHalf} max-sm:border-t max-sm:border-edge/60` : ""
                }`}
                initialCheckIn={fieldStart.checkIn}
                initialCheckOut={fieldStart.checkOut}
              />
              <GuestsPicker
                key={`guests-${fieldStart.n}`}
                className={`${field} ${divider} sm:border-r sm:border-edge/60 md:border-0 ${
                  collapsible ? `${guestsHalf} max-sm:border-t max-sm:border-edge/60` : ""
                }`}
                initialAdults={fieldStart.adults}
                initialChildren={fieldStart.children}
              />
              {hideFilters ? (
                <>
                  {(["minPrice", "maxPrice", "minRating", "numBeds", "bedSize"] as const).map(
                    (key) => filters[key] && <input key={key} type="hidden" name={key} value={filters[key]} />,
                  )}
                  {filters.tags?.map((tag) => <input key={tag} type="hidden" name="tags" value={tag} />)}
                </>
              ) : (
                <SearchFiltersPicker
                  className={`${field} ${divider} md:flex-none md:justify-center ${compact ? "md:w-[76px]" : "md:w-[88px]"} ${
                    collapsible ? filtersBesideWhere : ""
                  }`}
                  initialValues={filters}
                />
              )}
            </div>

            <div style={{ "--i": 1 } as React.CSSProperties} className={`flex gap-2.5 ${buttonsCell} ${collapsible ? phonePanelRow : ""}`}>
              <button
                type="submit"
                aria-label="Search"
                title="Search"
                className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue text-base font-semibold text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue lg:flex-none ${searchButtonSize} ${insideBar}`}
              >
                <SearchIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
                <span className="lg:sr-only">Search</span>
              </button>
              <AskAiButton
                // detail is 0 when Enter or Space pressed the button
                onClick={(e) => switchMode("ai", e.detail > 0)}
                // On phones the summary bar has its own Ask AI
                className={`flex-1 lg:flex-none ${toggleSize} ${insideBar} ${collapsible ? "max-sm:hidden" : ""}`}
              />
            </div>
          </div>
        </form>
      ) : (
        <>
        <form action="/search" onSubmit={submitAiSearch} aria-busy={aiBusy} className={`flex min-w-0 flex-1 flex-col gap-2.5 ${row}`}>
          <div
            className={`flex min-w-0 flex-1 ${barSurface} ${barCell} ${barPadding}`}
          >
            <label className={`${field} w-full`} onPointerDown={() => setAiPointerFocus(true)}>
              <span className={`flex shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
                <SparklesIcon />
              </span>
              <span className="sr-only">Tell us about your dream stay</span>
              <span className="relative flex min-w-0 flex-1 items-center">
                <input
                  name="aiPrompt"
                  onChange={(e) => {
                    setAiText(e.target.value);
                    // A new prompt replaces the last reply
                    setAiNote("");
                    setAiError("");
                  }}
                  onFocus={() => setAiFocused(true)}
                  onBlur={() => {
                    setAiFocused(false);
                    setAiPointerFocus(false);
                  }}
                  defaultValue={initialValues.aiPrompt ?? ""}
                  maxLength={MAX_PROMPT_CHARS}
                  autoComplete="off"
                  autoFocus={!!switchedBy}
                  readOnly={aiBusy}
                  data-trigger
                  data-pointer-focus={aiPointerFocus || undefined}
                  className="w-full min-w-0 bg-transparent text-base text-ink outline-none focus:outline-hidden"
                />
                {!aiText && (
                  <span className="pointer-events-none absolute inset-0 flex items-center">
                    <RotatingPlaceholder kind="ai" paused={aiFocused} className="w-full text-base text-slate" />
                  </span>
                )}
              </span>
            </label>
          </div>

          <div className={`flex gap-2.5 ${buttonsCell}`}>
            <button
              type="submit"
              aria-label={aiBusy ? "Searching with AI" : "Search with AI"}
              title="Search with AI"
              aria-disabled={aiBusy}
              className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue text-base font-semibold text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue aria-disabled:cursor-progress lg:flex-none ${searchButtonSize} ${insideBar}`}
            >
              {aiBusy ? (
                <span className={`animate-spin rounded-full border-2 border-on-blue/40 border-t-on-blue ${compact ? "h-5 w-5" : "h-6 w-6"}`} aria-hidden />
              ) : (
                <SearchIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
              )}
              <span className="lg:sr-only">Search</span>
            </button>
            <button
                type="button"
                aria-pressed="true"
                onClick={(e) => switchMode("standard", e.detail > 0)}
                className={`standard-return-button flex flex-1 shrink-0 items-center justify-center gap-2 rounded-2xl text-blue transition-[border-color,color,background-color,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue lg:flex-none ${toggleSize} ${insideBar}`}
                title="Return to standard search"
                aria-label="Return to standard search"
            >
              <ReturnIcon />
              <span className="text-center text-base leading-tight font-semibold text-blue-dark lg:sr-only">Standard search</span>
            </button>
          </div>
        </form>
        {(aiNote || aiError) && (
          <p
            role="status"
            className={`mt-2.5 rounded-2xl border bg-surface/90 px-4 py-3 text-sm leading-6 backdrop-blur-md ${aiError ? "border-danger/35 text-danger" : "border-edge text-ink"}`}
          >
            {aiError || aiNote}
          </p>
        )}
        </>
      )}
    </SearchDrift>
  );
}
