"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { buttonClass, iconButtonClass } from "./styles";

/**
 * Row of tabs (the pill buttons from Popular destinations). Arrow keys, Home
 * and End move between tabs. Children, if given, render as the tab panel.
 *
 *   <Tabs label="Destinations" items={[{ id: "near", label: "Near you" }]} value={tab} onChange={setTab}>
 *     …panel for the selected tab…
 *   </Tabs>
 */
export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  className = "",
  children,
}: {
  label: string;
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const baseId = useId();
  const tabId = (id: T) => `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel`;

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].id);
    document.getElementById(tabId(items[next].id))?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {items.map((t, i) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              id={tabId(t.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={children !== undefined ? panelId : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              // forced-colors: backgrounds vanish in Windows high contrast, so the selected tab gets an outline
              className={`${selected ? `${buttonClass("primary")} border border-blue` : buttonClass("secondary")} forced-colors:aria-selected:outline-2 forced-colors:aria-selected:outline-offset-2`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        // tabIndex 0: Tab can move into the panel even when it has nothing focusable (APG tabs pattern)
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(value)}
          tabIndex={0}
          className="mt-5 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * −/+ counter with a label, e.g. adults and children.
 *
 *   <Stepper label="Adults" hint="Ages 13 or above" value={adults} min={1} max={16} onChange={setAdults} />
 */
export function Stepper({
  label,
  hint,
  value,
  min = 0,
  max = 99,
  size = "md",
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  /** md = 46px buttons (the default, per the component sheet); sm = 36px for tight spots like popovers */
  size?: "md" | "sm";
  onChange: (value: number) => void;
}) {
  const icon = (d: string) => (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d={d} />
    </svg>
  );
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-base font-semibold text-ink">{label}</p>
        {hint && <p className="text-sm text-slate">{hint}</p>}
      </div>
      {/* At a limit the button is aria-disabled (not disabled), so it keeps keyboard focus */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          aria-disabled={value <= min}
          onClick={() => value > min && onChange(value - 1)}
          className={iconButtonClass(size)}
        >
          {icon("M5 10h10")}
        </button>
        <span className="w-6 text-center text-base font-semibold tabular-nums text-ink" aria-live="polite" aria-label={`${value} ${label.toLowerCase()}`}>
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          aria-disabled={value >= max}
          onClick={() => value < max && onChange(value + 1)}
          className={iconButtonClass(size)}
        >
          {icon("M5 10h10M10 5v10")}
        </button>
      </div>
    </div>
  );
}

/**
 * Button that opens a small panel under it (unrolls from the top, like the
 * search bar's guests picker). Closes on outside click or Escape. Give rows
 * inside the class "cascade" (and style={{ "--i": n }}) to have them drop in
 * one after another. Children can be a function that receives `close`.
 *
 *   <Popover label="Guests" trigger="2 guests">
 *     {(close) => <>…<Button onClick={close}>Done</Button></>}
 *   </Popover>
 */
export function Popover({
  label,
  trigger,
  align = "left",
  // 20rem, but never wider than the screen (the closed panel still takes up layout space)
  panelClassName = "w-[min(20rem,calc(100vw-2rem))]",
  triggerClassName,
  children,
}: {
  label: string;
  trigger: React.ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
  triggerClassName?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Closed while focus was inside the panel (e.g. its Done button): send focus
  // back to the trigger. Layout effect, so it runs before the browser drops
  // focus from the now-inert panel.
  useLayoutEffect(() => {
    if (!open && panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      // Tabbing out of the popover closes it, so it doesn't cover what gets focus next
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? buttonClass("secondary")}
      >
        {trigger}
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-slate transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5.5 7.5L10 12l4.5-4.5" />
        </svg>
      </button>
      <div
        ref={panelRef}
        role="dialog"
        aria-label={label}
        data-open={open}
        inert={!open}
        className={`dropdown absolute top-full z-30 mt-2 rounded-2xl border border-edge bg-surface p-4 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)] ${
          align === "right" ? "right-0" : "left-0"
        } ${panelClassName}`}
      >
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  );
}
