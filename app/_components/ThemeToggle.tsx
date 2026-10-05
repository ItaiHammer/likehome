"use client";

import { useSyncExternalStore } from "react";

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const isDark = () => document.documentElement.dataset.theme === "dark";

/*
 * Square icon button in the header, with the same border and height as the controls. The
 * inline script in layout.tsx applies the saved theme before first paint and
 * the moon/sun swap via `dark:` styles, so the icon is right from the first
 * frame; the hook only keeps aria-pressed in sync. While the switch settles,
 * .theme-fading on <html> makes every color fade (see globals.css) for
 * --theme-fade.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const fadeMs = parseFloat(getComputedStyle(root).getPropertyValue("--theme-fade")) * 1000 || 0;
    root.classList.add("theme-fading");
    root.dataset.theme = next;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => root.classList.remove("theme-fading"), fadeMs + 50);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-edge text-slate transition-colors hover:border-blue/50 hover:text-ink focus-visible:border-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue"
    >
      {/* Moon (shown in light mode) */}
      <svg viewBox="0 0 24 24" className="h-5 w-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" strokeLinejoin="round" />
      </svg>
      {/* Sun (shown in dark mode) */}
      <svg viewBox="0 0 24 24" className="hidden h-5 w-5 dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
      </svg>
    </button>
  );
}
