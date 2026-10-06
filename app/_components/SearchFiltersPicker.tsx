"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchFilterValues = {
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  numBeds?: string;
  bedSize?: string;
  tags?: string[];
};

const BED_COUNTS = ["1", "2", "3", "4"];
const BED_SIZES = ["Twin", "Twin XL", "Double", "Queen", "King"];
const RATINGS = ["3", "4", "4.5"];

// These labels mirror the tags currently supported by the search backend.
// TODO(INTEGRATION): Keep this list in sync with the backend's canonical tag list.
const AMENITY_TAGS = [
  "Washer & Dryer",
  "Parking",
  "EV Charging",
  "Free Meals",
  "Pool",
  "Gym",
  "Gift Shops",
  "ADA Compliant",
  "Kitchen",
  "Free Wi-Fi",
  "Housekeeping",
];

const TRAVELER_TAGS = ["Families", "Kids", "Pets", "Couples", "Friends"];

type PriceField = "min" | "max";

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
        active
          ? "border-blue bg-blue/10 text-blue-dark"
          : "border-edge bg-surface text-slate hover:border-blue/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
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
  const [minPrice, setMinPrice] = useState(initialValues.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(initialValues.maxPrice ?? "");
  const [minRating, setMinRating] = useState(initialValues.minRating ?? "");
  const [numBeds, setNumBeds] = useState(initialValues.numBeds ?? "");
  const [bedSize, setBedSize] = useState(initialValues.bedSize ?? "");
  const [tags, setTags] = useState<string[]>(initialValues.tags ?? []);
  const [priceError, setPriceError] = useState<PriceField | null>(null);
  const [rangeError, setRangeError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeCount = useMemo(
    () =>
      Number(Boolean(minPrice || maxPrice)) +
      Number(Boolean(minRating)) +
      Number(Boolean(numBeds)) +
      Number(Boolean(bedSize)) +
      tags.length,
    [bedSize, maxPrice, minPrice, minRating, numBeds, tags],
  );

  const toggleTag = (tag: string) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const updatePrice = (field: PriceField, rawValue: string) => {
    const value = rawValue.replace(/[$,\s]/g, "");
    const setter = field === "min" ? setMinPrice : setMaxPrice;

    setRangeError("");

    if (!value) {
      setter("");
      if (priceError === field) setPriceError(null);
      return;
    }

    if (!/^\d+$/.test(value)) {
      setter("");
      setPriceError(field);
      return;
    }

    setter(value);
    setPriceError(null);
  };

  const clear = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setNumBeds("");
    setBedSize("");
    setTags([]);
    setPriceError(null);
    setRangeError("");
  };

  const applyFilters = () => {
    if (priceError) return;

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setRangeError("Minimum can't be greater than maximum.");
      return;
    }

    setRangeError("");
    setOpen(false);
    ref.current?.closest("form")?.requestSubmit();
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        data-trigger
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} applied` : "Filters"}
        // A row on phones; on desktop a slim tile: the icon over a short label
        className="flex w-full min-w-0 items-center gap-2.5 bg-transparent text-left outline-none md:flex-col md:justify-center md:gap-1 md:text-center"
      >
        <span className="relative text-slate">
          <SlidersIcon />
          {activeCount > 0 && (
            <span className="absolute -right-2.5 -top-2 hidden h-4 min-w-4 items-center justify-center rounded-full bg-blue px-1 text-[10px] font-semibold leading-none text-on-blue tabular-nums md:flex">
              {activeCount}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 md:hidden">
          <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate">Filters</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-ink">
            {activeCount > 0 ? `${activeCount} applied` : "Add filters"}
            <ChevronIcon />
          </span>
        </span>
        <span className="hidden text-xs font-semibold text-ink md:block">Filters</span>
      </button>

      {/* Inputs remain mounted while the panel is closed so the parent search form always submits them. */}
      <input type="hidden" name="minPrice" value={minPrice} />
      <input type="hidden" name="maxPrice" value={maxPrice} />
      <input type="hidden" name="minRating" value={minRating} />
      <input type="hidden" name="numBeds" value={numBeds} />
      <input type="hidden" name="bedSize" value={bedSize} />
      {tags.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}

      <div
        data-open={open}
        role="dialog"
        aria-label="Search filters"
        className="dropdown absolute left-0 top-full z-40 mt-3 max-h-[70vh] w-full overflow-y-auto overscroll-contain rounded-2xl border border-edge bg-surface p-4 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)] sm:left-auto sm:right-0 sm:w-[min(92vw,42rem)] sm:p-5"
      >
        <div className="cascade" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="text-base font-semibold text-ink">Filters</p>
          <p className="mt-1 text-sm text-slate">Narrow the results without leaving the search bar.</p>
        </div>

        <div className="cascade mt-5 grid gap-5 sm:grid-cols-2" style={{ "--i": 2 } as React.CSSProperties}>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Price per night</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label
                className={`rounded-xl border bg-paper/40 px-3 py-2.5 focus-within:ring-1 ${
                  priceError === "min" ? "border-danger focus-within:border-danger focus-within:ring-danger" : "border-edge focus-within:border-blue focus-within:ring-blue"
                }`}
              >
                <span className="block text-xs font-medium text-slate">Minimum</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-ink">
                  <span aria-hidden>$</span>
                  <input
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
                      placeholder={priceError === "min" ? "Please enter a number" : "0"}
                      aria-invalid={priceError === "min"}
                      className={`w-full min-w-0 bg-transparent outline-none ${
                          priceError === "min"
                              ? "placeholder:text-danger"
                              : "placeholder:text-slate"
                      }`}
                  />
                </span>
              </label>
              <label
                className={`rounded-xl border bg-paper/40 px-3 py-2.5 focus-within:ring-1 ${
                  priceError === "max" ? "border-danger focus-within:border-danger focus-within:ring-danger" : "border-edge focus-within:border-blue focus-within:ring-blue"
                }`}
              >
                <span className="block text-xs font-medium text-slate">Maximum</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-ink">
                  <span aria-hidden>$</span>
                  <input
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
                      placeholder={priceError === "max" ? "Please enter a number" : "Any"}
                      aria-invalid={priceError === "max"}
                      className={`w-full min-w-0 bg-transparent outline-none ${
                          priceError === "max"
                              ? "placeholder:text-danger"
                              : "placeholder:text-slate"
                      }`}
                  />
                </span>
              </label>
            </div>
            {rangeError && <p className="mt-2 text-xs font-medium text-danger">{rangeError}</p>}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Minimum rating</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATINGS.map((rating) => (
                <FilterChip key={rating} active={minRating === rating} onClick={() => setMinRating(minRating === rating ? "" : rating)}>
                  {rating}+ stars
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Beds</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {BED_COUNTS.map((count) => (
                <FilterChip key={count} active={numBeds === count} onClick={() => setNumBeds(numBeds === count ? "" : count)}>
                  {count}+
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Bed size</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {BED_SIZES.map((size) => (
                <FilterChip key={size} active={bedSize === size} onClick={() => setBedSize(bedSize === size ? "" : size)}>
                  {size}
                </FilterChip>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="cascade mt-5 border-t border-edge pt-5" style={{ "--i": 3 } as React.CSSProperties}>
          <legend className="text-sm font-semibold text-ink">Amenities</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITY_TAGS.map((tag) => (
              <FilterChip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </FilterChip>
            ))}
          </div>
        </fieldset>

        <fieldset className="cascade mt-5 border-t border-edge pt-5" style={{ "--i": 4 } as React.CSSProperties}>
          <legend className="text-sm font-semibold text-ink">Good for</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRAVELER_TAGS.map((tag) => (
              <FilterChip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </FilterChip>
            ))}
          </div>
        </fieldset>

        <div className="cascade mt-5 flex items-center justify-between gap-4 border-t border-edge pt-4" style={{ "--i": 5 } as React.CSSProperties}>
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
      </div>
    </div>
  );
}
