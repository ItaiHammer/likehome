"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type RawParams = Record<string, string | string[] | undefined>;

type SortValue = "recommended" | "price-low" | "price-high";

const OPTIONS: { value: SortValue; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
];

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buildHref(params: RawParams, sort: SortValue) {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (key === "sort" || key === "page" || raw === undefined || raw === "") continue;
    const values = Array.isArray(raw) ? raw : [raw];
    values.forEach((value) => query.append(key, value));
  }
  if (sort !== "recommended") query.set("sort", sort);
  const suffix = query.toString();
  return suffix ? `/search?${suffix}` : "/search";
}

export function SortSelect({ current = "recommended", params }: { current?: string; params: RawParams }) {
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = OPTIONS.find((option) => option.value === current) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      onBlur={(event) => {
        if (event.relatedTarget && !ref.current?.contains(event.relatedTarget)) setOpen(false);
      }}
      className="relative"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className="inline-flex min-w-[12rem] items-center justify-between gap-3 rounded-xl border border-edge bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-blue/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <span>
          <span className="mr-1 font-medium text-slate">Sort:</span>
          {selected.label}
        </span>
        <ChevronIcon />
      </button>

      <div
        ref={menuRef}
        data-open={open}
        className="dropdown absolute left-0 top-full z-30 mt-2 w-56 rounded-2xl border border-edge bg-surface p-2 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)] sm:left-auto sm:right-0"
      >
        {OPTIONS.map((option, index) => (
          <Link
            key={option.value}
            href={buildHref(params, option.value)}
            aria-current={selected.value === option.value ? "true" : undefined}
            style={{ "--i": index + 1 } as React.CSSProperties}
            onClick={() => setOpen(false)}
            className={`cascade flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
              selected.value === option.value ? "bg-blue/10 font-semibold text-blue-dark" : "text-ink hover:bg-blue/5"
            }`}
          >
            {option.label}
            {selected.value === option.value && <span aria-hidden>✓</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
