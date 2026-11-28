"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  bedSizes,
  displayAmenityLabel,
  propertyAmenities,
  roomAmenities,
  travelerTypes,
} from "../search/types";
import { Chip, iconButtonClass } from "./ui";

export type SearchFilterValues = {
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  numBeds?: string;
  bedSize?: string;
  tags?: string[];
};

const BED_COUNTS = ["1", "2", "3", "4"];
const RATINGS = ["3", "4", "4.5"];

const BED_SIZES = bedSizes;

const AMENITY_TAGS = [
  ...propertyAmenities,
  ...roomAmenities,
];

const TRAVELER_TAGS = travelerTypes;
type PriceField = "min" | "max";

const isWholeNumber = (value: string) => /^\d+$/.test(value);

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Portal avoids the search bar's clipping and stacking context. On desktop the
// panel is anchored below the *entire* search form; on narrow screens it remains
// a native modal bottom sheet with keyboard focus management.
function FiltersPanel({
  sheetRef,
  onClose,
  children,
}: {
  sheetRef: React.RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <dialog
      ref={sheetRef}
      aria-label="Search filters"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed bottom-0 left-0 right-0 top-auto z-[100] m-0 max-h-[84dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-edge bg-surface p-0 text-ink shadow-[0_18px_65px_-20px_rgba(7,13,47,0.4)] backdrop:bg-[#070d2f]/55 sm:bottom-auto sm:right-auto sm:rounded-2xl sm:max-h-[70dvh]"
    >
      <div className="px-5 pt-5 sm:px-7 sm:pt-7">{children}</div>
    </dialog>
  );
}

export function SearchFiltersPicker({
  className = "",
  initialValues = {},
}: {
  className?: string;
  initialValues?: SearchFilterValues;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minPrice, setMinPrice] = useState(initialValues.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(initialValues.maxPrice ?? "");
  const [minRating, setMinRating] = useState(initialValues.minRating ?? "");
  const [numBeds, setNumBeds] = useState(initialValues.numBeds ?? "");
  const [bedSize, setBedSize] = useState(initialValues.bedSize ?? "");
  const [tags, setTags] = useState<string[]>(initialValues.tags ?? []);
  const [rangeError, setRangeError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const minInvalid = minPrice !== "" && !isWholeNumber(minPrice);
  const maxInvalid = maxPrice !== "" && !isWholeNumber(maxPrice);
  const validMin = minInvalid ? "" : minPrice;
  const validMax = maxInvalid ? "" : maxPrice;
  const priceError = minInvalid || maxInvalid ? "Please enter a number" : rangeError;

  useEffect(() => setMounted(true), []);

  // The dialog lives outside the search form in document.body. Desktop uses
  // show() so the bar stays visible and usable; mobile uses a modal bottom sheet.
  useEffect(() => {
    const dialog = sheetRef.current;
    if (!dialog || !mounted) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    const reposition = () => {
      const mobile = window.innerWidth < 640;
      if (mobile) {
        dialog.style.removeProperty("top");
        dialog.style.removeProperty("left");
        dialog.style.removeProperty("right");
        dialog.style.removeProperty("width");
        dialog.style.removeProperty("bottom");
        dialog.style.removeProperty("max-height");
      } else {
        const bar = triggerRef.current?.closest<HTMLFormElement>("form[data-search-bar]");
        const rect = (bar ?? triggerRef.current)?.getBoundingClientRect();
        if (!rect) return;
        const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 180));
        const left = Math.max(8, rect.left);
        const width = Math.max(250, Math.min(rect.width, window.innerWidth - left - 8));
        dialog.style.top = `${top}px`;
        dialog.style.left = `${left}px`;
        dialog.style.right = "auto";
        dialog.style.bottom = "auto";
        dialog.style.width = `${width}px`;
        dialog.style.maxHeight = `${Math.min(680, Math.max(160, window.innerHeight - top - 12))}px`;
      }
    };
    reposition();
    if (!dialog.open) {
      if (window.innerWidth < 640) dialog.showModal();
      else dialog.show();
      closeRef.current?.focus({ preventScroll: true });
    }
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!dialog.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open, mounted]);

  const activeCount = useMemo(
    () =>
      Number(Boolean(validMin || validMax)) +
      Number(Boolean(minRating)) +
      Number(Boolean(numBeds)) +
      Number(Boolean(bedSize)) +
      tags.length,
    [bedSize, validMax, validMin, minRating, numBeds, tags],
  );

  const toggleTag = (tag: string) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const updatePrice = (field: PriceField, rawValue: string) => {
    (field === "min" ? setMinPrice : setMaxPrice)(rawValue.replace(/[$,\s]/g, ""));
    setRangeError("");
  };

  const clear = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setNumBeds("");
    setBedSize("");
    setTags([]);
    setRangeError("");
  };

  const applyFilters = () => {
    if (minInvalid || maxInvalid) {
      (minInvalid ? minRef : maxRef).current?.focus();
      return;
    }

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setRangeError("Minimum can't be greater than maximum.");
      minRef.current?.focus();
      return;
    }

    setRangeError("");
    setOpen(false);
    triggerRef.current?.closest("form")?.requestSubmit();
  };

  return (
    <div
      className={`relative ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        data-trigger
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} applied` : "Filters"}
        // A row on phones; on desktop a slim tile: the icon over a short label
        className="flex w-full min-w-0 items-center gap-2.5 bg-transparent text-left outline-none after:absolute after:inset-0 md:flex-col md:justify-center md:gap-1 md:text-center"
      >
        <span className="relative text-slate">
          <SlidersIcon />
          {activeCount > 0 && (
            <span className="absolute -right-2.5 -top-2 hidden h-4 min-w-4 items-center justify-center rounded-full bg-blue px-1 text-[10px] font-semibold leading-none text-on-blue tabular-nums md:flex">
              {activeCount}
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-base text-ink md:hidden">
          <span className="truncate">
            {activeCount > 0 ? `${activeCount} ${activeCount === 1 ? "filter" : "filters"}` : "Add filters"}
          </span>
          <ChevronIcon />
        </span>
        <span className="hidden text-xs font-semibold text-ink md:block">Filters</span>
      </button>

      {/* Inputs remain mounted while the panel is closed so the parent search form always submits them. */}
      <input type="hidden" name="minPrice" value={validMin} />
      <input type="hidden" name="maxPrice" value={validMax} />
      <input type="hidden" name="minRating" value={minRating} />
      <input type="hidden" name="numBeds" value={numBeds} />
      <input type="hidden" name="bedSize" value={bedSize} />
      {tags.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}

      {mounted && createPortal(
      <FiltersPanel sheetRef={sheetRef} onClose={() => setOpen(false)}>
        <div className="cascade flex items-start justify-between gap-4" style={{ "--i": 1 } as React.CSSProperties}>
          <div>
            <p className="text-base font-semibold text-ink">Filters</p>
            <p className="mt-1 text-sm text-slate">Refine your stay by price, room features, and amenities.</p>
          </div>
          <button ref={closeRef} type="button" aria-label="Close filters" onClick={() => setOpen(false)} className={iconButtonClass("sm")}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="cascade mt-5 grid gap-5 sm:grid-cols-2" style={{ "--i": 2 } as React.CSSProperties}>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Price per night</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label
                className={`rounded-xl border bg-surface px-3 py-2.5 focus-within:ring-1 ${
                  minInvalid || rangeError ? "border-danger focus-within:border-danger focus-within:ring-danger" : "border-edge focus-within:border-blue focus-within:ring-blue"
                }`}
              >
                <span className="block text-xs font-medium text-slate">Minimum</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-ink">
                  <span aria-hidden>$</span>
                  <input
                      ref={minRef}
                      inputMode="numeric"
                      type="text"
                      value={minPrice}
                      onChange={(event) => updatePrice("min", event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          applyFilters();
                        }
                      }}
                      placeholder="0"
                      aria-invalid={minInvalid || Boolean(rangeError)}
                      aria-describedby={minInvalid || rangeError ? errorId : undefined}
                      className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate"
                  />
                </span>
              </label>
              <label
                className={`rounded-xl border bg-surface px-3 py-2.5 focus-within:ring-1 ${
                  maxInvalid ? "border-danger focus-within:border-danger focus-within:ring-danger" : "border-edge focus-within:border-blue focus-within:ring-blue"
                }`}
              >
                <span className="block text-xs font-medium text-slate">Maximum</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-ink">
                  <span aria-hidden>$</span>
                  <input
                      ref={maxRef}
                      inputMode="numeric"
                      type="text"
                      value={maxPrice}
                      onChange={(event) => updatePrice("max", event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          applyFilters();
                        }
                      }}
                      placeholder="Any"
                      aria-invalid={maxInvalid}
                      aria-describedby={maxInvalid ? errorId : undefined}
                      className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate"
                  />
                </span>
              </label>
            </div>
            {priceError && (
              <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-danger">
                {priceError}
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Minimum rating</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATINGS.map((rating) => (
                <Chip key={rating} active={minRating === rating} onClick={() => setMinRating(minRating === rating ? "" : rating)}>
                  {rating}+ stars
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Beds</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {BED_COUNTS.map((count) => (
                <Chip key={count} active={numBeds === count} onClick={() => setNumBeds(numBeds === count ? "" : count)}>
                  {count}+
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Bed size</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {BED_SIZES.map((size) => (
                <Chip key={size} active={bedSize === size} onClick={() => setBedSize(bedSize === size ? "" : size)}>
                  {size}
                </Chip>
              ))}
            </div>
          </fieldset>
        </div>

        <section
            className="cascade mt-5 border-t border-edge pt-5"
            style={{ "--i": 3 } as React.CSSProperties}
        >
          <h3 className="text-sm font-semibold text-ink">
            Amenities
          </h3>

          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITY_TAGS.map((tag) => (
                <Chip
                    key={tag}
                    active={tags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                >
                  {displayAmenityLabel(tag)}
                </Chip>
            ))}
          </div>
        </section>

        <section
            className="cascade mt-5 border-t border-edge pt-5"
            style={{ "--i": 4 } as React.CSSProperties}
        >
          <h3 className="text-sm font-semibold text-ink">
            Good for
          </h3>

          <div className="mt-2 flex flex-wrap gap-2">
            {TRAVELER_TAGS.map((tag) => (
                <Chip
                    key={tag}
                    active={tags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Chip>
            ))}
          </div>
        </section>

        <div
          className="cascade sticky bottom-0 -mx-5 mt-5 flex items-center justify-between gap-4 border-t border-edge bg-surface px-5 py-4 sm:-mx-7 sm:px-7 sm:pb-6"
          style={{ "--i": 5 } as React.CSSProperties}
        >
          <div>
            {activeCount > 0 && (
              <button type="button" onClick={clear} className="text-sm font-semibold text-blue hover:text-blue-dark">
                Clear
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-on-blue transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            Apply filters
          </button>
        </div>
      </FiltersPanel>, document.body)}
    </div>
  );
}
