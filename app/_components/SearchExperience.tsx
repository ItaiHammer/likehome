"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
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

type AiSearchResult = {
  text?: string;
  where?: string;
  checkIn?: string;
  checkOut?: string;
  numBeds?: string;
  bedSize?: string;
  adults?: string;
  children?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  sort?: string;
  tags?: string[];
};

function parseAiSearchMessage(message: UIMessage): AiSearchResult | null {
  const raw = message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AiSearchResult;
  } catch {
    console.error("Could not parse AI search response:", raw);
    return null;
  }
}

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

function isPositiveNumber(value?: string) {
  if (!value) return false;

  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

export function SearchExperience({
  initialValues = {},
  initialMode = initialValues.aiPrompt ? "ai" : "standard",
  compact = false,
}: {
  initialValues?: SearchInitialValues;
  initialMode?: SearchMode;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [aiInput, setAiInput] = useState(initialValues.aiPrompt ?? "");
  const submittedAiPrompt = useRef(initialValues.aiPrompt ?? "");
  const router = useRouter();

  const { sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/search/ai",
    }),

    onFinish: ({ message, isError }) => {
      if (isError) {
        console.error("AI search failed.");
        return;
      }

      const result = parseAiSearchMessage(message);

      if (!result) {
        console.error("AI search returned an unreadable response.");
        return;
      }

      const query = new URLSearchParams();

      query.set("aiPrompt", submittedAiPrompt.current);

      if (result.text) query.set("aiReply", result.text);
      if (result.where) query.set("where", result.where);
      if (result.checkIn) query.set("checkIn", result.checkIn);
      if (result.checkOut) query.set("checkOut", result.checkOut);
      if (isPositiveNumber(result.adults)) {
        query.set("adults", result.adults!);
      }

      if (isPositiveNumber(result.children)) {
        query.set("children", result.children!);
      }

      if (isPositiveNumber(result.minPrice)) {
        query.set("minPrice", result.minPrice!);
      }

      if (isPositiveNumber(result.maxPrice)) {
        query.set("maxPrice", result.maxPrice!);
      }

      if (isPositiveNumber(result.minRating)) {
        query.set("minRating", result.minRating!);
      }

      if (isPositiveNumber(result.numBeds)) {
        query.set("numBeds", result.numBeds!);
      }

      if (result.bedSize?.trim()) {
        query.set("bedSize", result.bedSize);
      }
      if (result.sort) query.set("sort", result.sort);

      result.tags?.forEach((tag) => {
        query.append("tags", tag);
      });

      router.push(`/search?${query.toString()}`);
    },

    onError: (error) => {
      console.error("AI search error:", error);
    },
  });

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

  const barPadding = compact ? "p-1.5 md:py-0" : "p-2 md:py-0";
  const searchButtonSize = compact ? "h-12 md:h-auto md:w-[56px]" : "h-14 md:h-auto md:w-[66px]";
  const toggleSize = compact
      ? "h-12 md:h-auto md:w-[54px]"
      : "h-14 md:h-auto md:w-[58px]";
  const handleAiSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = aiInput.trim();

    if (!prompt || status === "submitted" || status === "streaming") {
      return;
    }

    submittedAiPrompt.current = prompt;
    void sendMessage({ text: prompt });
  };

  return (
    <SearchDrift>
      {mode === "standard" ? (
        <form action="/search" className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row">
          <div
            className={`grid min-w-0 flex-1 grid-cols-1 divide-y divide-edge/60 rounded-2xl border border-(--bar-edge) bg-surface/80 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md sm:grid-cols-2 sm:divide-y-0 md:flex md:flex-row md:divide-x ${barPadding}`}
          >
            <DestinationInput
              className={`${field} sm:col-span-1 sm:border-b sm:border-r sm:border-edge/60 md:flex-[1.6] md:border-0`}
              initialValue={initialValues.where ?? ""}
            />
            <DatesField
              className={`${field} sm:col-span-1 sm:border-b sm:border-edge/60 md:flex-[1.15] md:border-0`}
              initialCheckIn={initialValues.checkIn ?? ""}
              initialCheckOut={initialValues.checkOut ?? ""}
            />
            <GuestsPicker
              className={`${field} sm:border-r sm:border-edge/60 md:border-0`}
              initialAdults={initialValues.adults ?? 2}
              initialChildren={initialValues.children ?? 0}
            />
            <SearchFiltersPicker className={`${field} md:flex-[0.95]`} initialValues={filters} />
          </div>

          <div className="flex gap-2.5 md:contents">
            <button
              type="submit"
              aria-label="Search"
              title="Search"
              className={`flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-blue text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue md:flex-none ${searchButtonSize}`}
            >
              <SearchIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
            </button>
            <button
                type="button"
                aria-pressed="false"
                onClick={() => setMode("ai")}
                className={`flex flex-1 shrink-0 items-center justify-center rounded-2xl
                  bg-[linear-gradient(135deg,#8B5CF6,#4C79BD,#49B6C8,#F09A8A)]
                  p-[3px]
                  transition-transform duration-200
                  hover:-translate-y-0.5
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue
                  md:flex-none
                  ${toggleSize}`}
                title="Search with AI"
                aria-label="Search with AI"
            >
                <span className="flex h-full w-full items-center justify-center rounded-[13px] bg-surface text-blue">
                  <SparklesIcon />
                  <span className="sr-only">Search with AI</span>
                </span>
            </button>
          </div>
        </form>
      ) : (
          <form
              onSubmit={handleAiSubmit}
              className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row"
          >
          <div
            className={`flex min-w-0 flex-1 rounded-2xl border border-(--bar-edge) bg-surface/80 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md ${barPadding}`}
          >
            <label className={`${field} w-full`}>
              <span className={`flex shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
                <SparklesIcon />
              </span>
              <span className="sr-only">Tell us about your dream stay</span>
              <input
                  name="aiPrompt"
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  autoComplete="off"
                  placeholder="Tell us about your dream stay"
                  className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-slate"
              />
            </label>
          </div>

          <div className="flex gap-2.5 md:contents">
            <button
                type="submit"
                disabled={status === "submitted" || status === "streaming"}
                aria-label="Search with AI"
                title="Search with AI"
                className={`flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-blue text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-60 md:flex-none ${searchButtonSize}`}
            >
              <SearchIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
            </button>
            <button
                type="button"
                aria-pressed="true"
                onClick={() => setMode("standard")}
                className={`standard-return-button flex flex-1 shrink-0 items-center justify-center rounded-2xl text-blue transition-[border-color,color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue md:flex-none ${toggleSize}`}                aria-label="Return to standard search"
            >
              <ReturnIcon />
              <span className="sr-only">Return to standard search</span>
            </button>
          </div>
        </form>
      )}
    </SearchDrift>
  );
}
