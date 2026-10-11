"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Tag } from "./ui";

// The app header's links, from the Figma "Shared navigation" (Stays · My bookings · My listings).
// Pages that don't exist yet are shown, but marked "Soon" and not clickable.
const NAV_ITEMS: { label: string; href?: string }[] = [
  { label: "Stays", href: "/#stays" },
  { label: "My bookings" },
  { label: "My listings", href: "/listings" },
];

function ComingSoon({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span aria-disabled="true" title="Coming soon" className={`inline-flex cursor-not-allowed items-center gap-2 text-slate ${className}`}>
      {label}
      <Tag>Soon</Tag>
    </span>
  );
}

// Links shown inline from tablet width up
export function DesktopNav() {
  return (
    <ul className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <li key={item.label}>
          {item.href ? (
            <Link href={item.href} className="rounded-control px-3 py-2 text-base font-medium text-slate hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <ComingSoon label={item.label} className="px-3 py-2 text-base font-medium" />
          )}
        </li>
      ))}
    </ul>
  );
}

// Phones: the same links behind a Menu button, in a panel under the header
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Only handle Escape meant for the menu (focus in it, or nowhere in particular),
    // so it doesn't steal focus from another open popover
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement;
      if (active && active !== document.body && !rootRef.current?.contains(active)) return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="md:hidden"
      // Tabbing out of the menu closes it, so it doesn't cover what gets focus next
      // (a null relatedTarget, like the window losing focus, is left alone)
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-control border border-edge text-slate transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav id={panelId} aria-label="Main" className="absolute inset-x-0 top-16 z-40 border-b border-edge bg-surface px-4 pb-4 shadow-[0_20px_40px_-24px_rgba(7,13,47,0.45)]">
          <ul className="divide-y divide-edge">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href} onClick={() => setOpen(false)} className="block py-3 text-base font-medium text-ink hover:text-blue">
                    {item.label}
                  </Link>
                ) : (
                  <ComingSoon label={item.label} className="py-3 text-base font-medium" />
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
