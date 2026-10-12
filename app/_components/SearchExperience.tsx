"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { readAiAnswer } from "./aiSearch";
import { RotatingPlaceholder } from "./placeholders";
import { DatesField } from "./DatesField";
import { DestinationInput } from "./DestinationInput";
import { GuestsPicker } from "./GuestsPicker";
import { SearchDrift } from "./SearchDrift";
import { SearchFiltersPicker, type SearchFilterValues } from "./SearchFiltersPicker";

type SearchMode = "standard" | "ai";

export type SearchInitialValues = SearchFilterValues & {
  where?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  aiPrompt?: string;
};

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
  const router = useRouter();

  // AI mode: send the prompt to Cara's /api/search/ai endpoint (the same way her
  // app/sample/search page does), then open the standard search it describes.
  // Off-topic prompts come back as a reply with no filters, shown under the bar.
  const promptRef = useRef("");
  const [aiNote, setAiNote] = useState("");
  const [aiError, setAiError] = useState("");
  // The AI box rolls through example requests while it's empty
  const [aiText, setAiText] = useState(initialValues.aiPrompt ?? "");
  const [aiFocused, setAiFocused] = useState(false);
  const [aiPointerFocus, setAiPointerFocus] = useState(false);
  // Set by a mode switch, so the newly shown field takes focus (never on page load)
  const [switchedBy, setSwitchedBy] = useState<"keyboard" | "pointer">();
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/search/ai" }));
  const { sendMessage, setMessages, status, stop } = useChat({
    transport,
    onFinish: ({ message, isError, isAbort, isDisconnect }) => {
      if (isError || isAbort || isDisconnect) return;
      const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
      const answer = readAiAnswer(text, promptRef.current);
      if (!answer) setAiError("Sorry, that didn't come through. Try asking again.");
      else if (answer.query) router.push(`/search?${answer.query}`);
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
    // The AI box remounts with its starting text, so match it
    setAiText(initialValues.aiPrompt ?? "");
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
        <form action="/search" className="flex min-w-0 flex-1 flex-col gap-2.5 lg:flex-row">
          <div
            className={`grid min-w-0 flex-1 grid-cols-1 divide-y divide-edge/60 rounded-2xl border border-(--bar-edge) bg-surface/80 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md sm:grid-cols-2 sm:divide-y-0 md:flex md:flex-row ${barPadding}`}
          >
            <DestinationInput
              className={`${field} sm:col-span-1 sm:border-b sm:border-r sm:border-edge/60 md:flex-[1.45] md:border-0 lg:flex-[1.6]`}
              initialValue={initialValues.where ?? ""}
              autoFocusFrom={switchedBy === "keyboard" ? "keyboard" : undefined}
            />
            <DatesField
              className={`${field} ${divider} sm:col-span-1 sm:border-b sm:border-edge/60 md:flex-[1.15] md:border-0`}
              initialCheckIn={initialValues.checkIn ?? ""}
              initialCheckOut={initialValues.checkOut ?? ""}
            />
            <GuestsPicker
              className={`${field} ${divider} sm:border-r sm:border-edge/60 md:border-0`}
              initialAdults={initialValues.adults ?? 2}
              initialChildren={initialValues.children ?? 0}
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
                className={`${field} ${divider} md:flex-none md:justify-center ${compact ? "md:w-[76px]" : "md:w-[88px]"}`}
                initialValues={filters}
              />
            )}
          </div>

          <div className="flex gap-2.5 lg:contents">
            <button
              type="submit"
              aria-label="Search"
              title="Search"
              className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue text-base font-semibold text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue lg:flex-none ${searchButtonSize}`}
            >
              <SearchIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
              <span className="lg:sr-only">Search</span>
            </button>
            <button
              type="button"
              aria-pressed="false"
              // detail is 0 when Enter or Space pressed the button
              onClick={(e) => switchMode("ai", e.detail > 0)}
              className={`flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8B5CF6,#4C79BD,#49B6C8,#F09A8A)] p-[3px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue lg:flex-none ${toggleSize}`}
              title="Search with AI"
            >
              <span className="flex h-full w-full items-center justify-center gap-2 rounded-[13px] bg-surface text-base font-semibold text-blue">
                <SparklesIcon />
                <span className="lg:sr-only">Ask AI</span>
              </span>
            </button>
          </div>
        </form>
      ) : (
        <>
        <form action="/search" onSubmit={submitAiSearch} aria-busy={aiBusy} className="flex min-w-0 flex-1 flex-col gap-2.5 lg:flex-row">
          <div
            className={`flex min-w-0 flex-1 rounded-2xl border border-(--bar-edge) bg-surface/80 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md ${barPadding}`}
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

          <div className="flex gap-2.5 lg:contents">
            <button
              type="submit"
              aria-label={aiBusy ? "Searching with AI" : "Search with AI"}
              title="Search with AI"
              aria-disabled={aiBusy}
              className={`flex flex-1 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue text-base font-semibold text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue aria-disabled:cursor-progress lg:flex-none ${searchButtonSize}`}
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
                className={`standard-return-button flex flex-1 shrink-0 items-center justify-center gap-2 rounded-2xl text-blue transition-[border-color,color,background-color,translate] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue lg:flex-none ${toggleSize}`}
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
