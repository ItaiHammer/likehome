"use client";

import { type FormEvent, useState } from "react";
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
}: {
  initialValues?: SearchInitialValues;
  initialMode?: SearchMode;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<SearchMode>(initialMode);

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
  const toggleSize = compact ? "h-12 w-12 md:h-auto md:w-[54px]" : "h-14 w-14 md:h-auto md:w-[58px]";

  const preventEmptyAiSubmit = (event: FormEvent<HTMLFormElement>) => {
    const prompt = new FormData(event.currentTarget).get("aiPrompt");
    if (typeof prompt !== "string" || !prompt.trim()) event.preventDefault();
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
              className={`ai-toggle flex shrink-0 items-center justify-center rounded-2xl text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${toggleSize}`}
              title="Search with AI"
              aria-label="Search with AI"
            >
              <SparklesIcon />
              <span className="sr-only">Search with AI</span>
            </button>
          </div>
        </form>
      ) : (
        <form action="/search" onSubmit={preventEmptyAiSubmit} className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row">
          {/* TODO(INTEGRATION): Cara's AI endpoint will translate aiPrompt into the same structured fields used by standard search. */}
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
                defaultValue={initialValues.aiPrompt ?? ""}
                autoComplete="off"
                placeholder="Tell us about your dream stay"
                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-slate"
              />
            </label>
          </div>

          <div className="flex gap-2.5 md:contents">
            <button
              type="submit"
              aria-label="Search with AI"
              title="Search with AI"
              className={`flex flex-1 shrink-0 items-center justify-center rounded-2xl bg-blue text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue md:flex-none ${searchButtonSize}`}
            >
              <SearchIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
            </button>
            <button
                type="button"
                aria-pressed="true"
                onClick={() => setMode("standard")}
                className={`standard-return-button flex shrink-0 items-center justify-center rounded-2xl text-blue transition-[border-color,color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${toggleSize}`}                title="Return to standard search"
                aria-label="Return to standard search"
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
