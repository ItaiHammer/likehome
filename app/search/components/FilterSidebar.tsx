"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bedSizes, propertyAmenities, roomAmenities, travelerTypes } from "../types";

type RawParams = Record<string, string | string[] | undefined>;

export type FilterValues = {
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  numBeds?: string;
  bedSize?: string;
  tags: string[];
};

const FILTER_KEYS = ["minPrice", "maxPrice", "minRating", "numBeds", "bedSize", "tags", "page"];
const AMENITIES = [...propertyAmenities, ...roomAmenities];
const RATINGS = ["3", "4", "4.5"];
const BED_COUNTS = ["1", "2", "3", "4"];
const AMENITIES_SHOWN = 6;

function hrefFor(params: RawParams, next: FilterValues) {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (FILTER_KEYS.includes(key) || raw === undefined || raw === "") continue;
    [raw].flat().forEach((value) => query.append(key, value));
  }
  for (const key of ["minPrice", "maxPrice", "minRating", "numBeds", "bedSize"] as const) {
    if (next[key]) query.set(key, next[key]);
  }
  next.tags.forEach((tag) => query.append("tags", tag));
  return `/search?${query}`;
}

function countActive(values: FilterValues) {
  return (
    Number(Boolean(values.minPrice || values.maxPrice)) +
    Number(Boolean(values.minRating)) +
    Number(Boolean(values.numBeds)) +
    Number(Boolean(values.bedSize)) +
    values.tags.length
  );
}

function useFilters(initial: FilterValues, params: RawParams) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initial);

  const apply = (patch: Partial<FilterValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    startTransition(() => router.replace(hrefFor(params, next), { scroll: false }));
  };

  return { values, apply, pending, active: countActive(values) };
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-[#E3A008]" fill="currentColor" aria-hidden>
      <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 1.8z" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="px-5 py-5">
      <legend className="float-left mb-3 w-full text-sm font-semibold text-ink">{title}</legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}

function CheckRow({ checked, onChange, type = "checkbox", name, children }: {
  checked: boolean;
  onChange: () => void;
  type?: "checkbox" | "radio";
  name?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-sm text-ink">
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 cursor-pointer accent-blue" />
      <span className="flex items-center gap-1.5">{children}</span>
    </label>
  );
}

function PriceInput({ label, value, placeholder, onCommit }: { label: string; value: string; placeholder: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  const commit = () => {
    const clean = text.replace(/[$,\s]/g, "");
    if (clean !== value && /^\d*$/.test(clean)) onCommit(clean);
  };
  return (
    <label className="rounded-xl border border-edge bg-paper/40 px-3 py-2 focus-within:border-blue focus-within:ring-1 focus-within:ring-blue">
      <span className="block text-xs font-medium text-slate">{label}</span>
      <span className="mt-0.5 flex items-center gap-1 text-sm text-ink">
        <span aria-hidden>$</span>
        <input
          inputMode="numeric"
          value={text}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && commit()}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate"
        />
      </span>
    </label>
  );
}

function FilterSections({ values, apply, radioGroup }: ReturnType<typeof useFilters> & { radioGroup: string }) {
  const [showAll, setShowAll] = useState(false);
  const toggleTag = (tag: string) =>
    apply({ tags: values.tags.includes(tag) ? values.tags.filter((item) => item !== tag) : [...values.tags, tag] });
  const amenities = showAll ? AMENITIES : AMENITIES.slice(0, AMENITIES_SHOWN);

  return (
    <div className="divide-y divide-edge">
      <Section title="Price per night">
        <div className="grid grid-cols-2 gap-2">
          <PriceInput key={`min-${values.minPrice}`} label="Min" value={values.minPrice ?? ""} placeholder="0" onCommit={(minPrice) => apply({ minPrice })} />
          <PriceInput key={`max-${values.maxPrice}`} label="Max" value={values.maxPrice ?? ""} placeholder="Any" onCommit={(maxPrice) => apply({ maxPrice })} />
        </div>
      </Section>

      <Section title="Guest rating">
        <CheckRow type="radio" name={`${radioGroup}-rating`} checked={!values.minRating} onChange={() => apply({ minRating: "" })}>
          Any
        </CheckRow>
        {RATINGS.map((rating) => (
          <CheckRow key={rating} type="radio" name={`${radioGroup}-rating`} checked={values.minRating === rating} onChange={() => apply({ minRating: rating })}>
            <StarIcon />
            {rating}+
          </CheckRow>
        ))}
      </Section>

      <Section title="Beds">
        <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-edge">
          {["", ...BED_COUNTS].map((count) => (
            <button
              key={count || "any"}
              type="button"
              aria-pressed={(values.numBeds ?? "") === count}
              onClick={() => apply({ numBeds: count })}
              className={`border-l border-edge py-2 text-sm font-medium transition-colors first:border-l-0 ${
                (values.numBeds ?? "") === count ? "bg-blue/10 text-blue-dark" : "text-slate hover:text-ink"
              }`}
            >
              {count ? `${count}+` : "Any"}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Bed size">
        <div className="flex flex-wrap gap-2">
          {bedSizes.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={values.bedSize === size}
              onClick={() => apply({ bedSize: values.bedSize === size ? "" : size })}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                values.bedSize === size ? "border-blue bg-blue/10 text-blue-dark" : "border-edge text-slate hover:border-blue/60 hover:text-ink"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Amenities">
        {amenities.map((tag) => (
          <CheckRow key={tag} checked={values.tags.includes(tag)} onChange={() => toggleTag(tag)}>
            {tag}
          </CheckRow>
        ))}
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 text-sm font-semibold text-blue-dark hover:underline">
          {showAll ? "Show fewer" : `Show all ${AMENITIES.length}`}
        </button>
      </Section>

      <Section title="Good for">
        {travelerTypes.map((tag) => (
          <CheckRow key={tag} checked={values.tags.includes(tag)} onChange={() => toggleTag(tag)}>
            {tag}
          </CheckRow>
        ))}
      </Section>
    </div>
  );
}

export function FilterSidebar({ initial, params, className = "" }: { initial: FilterValues; params: RawParams; className?: string }) {
  const filters = useFilters(initial, params);
  const clearAll = () => filters.apply({ minPrice: "", maxPrice: "", minRating: "", numBeds: "", bedSize: "", tags: [] });

  return (
    <aside aria-label="Filters" className={`rounded-2xl border border-edge bg-surface shadow-[0_18px_45px_-34px_rgba(7,13,47,0.45)] ${className}`}>
      <div className="flex items-center justify-between border-b border-edge px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          Filters
          {filters.pending && <span className="text-xs font-medium text-slate">Updating…</span>}
        </h2>
        {filters.active > 0 && (
          <button type="button" onClick={clearAll} className="text-sm font-semibold text-blue-dark hover:underline">
            Clear all
          </button>
        )}
      </div>
      <FilterSections {...filters} radioGroup="sidebar" />
    </aside>
  );
}

export function FilterSheetButton({ initial, params, total, className = "" }: { initial: FilterValues; params: RawParams; total: number; className?: string }) {
  const filters = useFilters(initial, params);
  const [open, setOpen] = useState(false);
  const clearAll = () => filters.apply({ minPrice: "", maxPrice: "", minRating: "", numBeds: "", bedSize: "", tags: [] });

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-edge bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-blue/60"
      >
        <SlidersIcon />
        Filters
        {filters.active > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue px-1.5 text-xs text-on-blue tabular-nums">{filters.active}</span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-50 flex flex-col bg-surface">
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <h2 className="text-base font-semibold text-ink">Filters</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate hover:text-ink">
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <FilterSections {...filters} radioGroup="sheet" />
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-edge px-4 py-3">
            <button type="button" onClick={clearAll} disabled={filters.active === 0} className="text-sm font-semibold text-blue-dark disabled:text-slate">
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-blue px-5 py-3 text-sm font-semibold text-on-blue hover:bg-blue-dark"
            >
              {filters.pending ? "Updating…" : `Show ${total} ${total === 1 ? "stay" : "stays"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
