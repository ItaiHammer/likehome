import { useRef } from "react";
import type { EditorTab } from "./editor-state";

const iconProps = {
  viewBox: "0 0 24 24",
  className: "h-[18px] w-[18px] shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "info",
    label: "Hotel information",
    icon: (
      <svg {...iconProps}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    id: "photos",
    label: "Photos",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 16 5-5 4 4 3-3 6 6" />
      </svg>
    ),
  },
  {
    id: "amenities",
    label: "Amenities",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3l2.1 2.4 3.1-.6.6 3.1L20.2 10l-1.5 2.8.9 3-3 1-1.2 2.9-3-.9L10 20.4l-1.4-2.8-3.1-.4.2-3.2L3.5 12l1.9-2.5-.5-3.1 3.1-.8L9.4 3z" />
        <circle cx="12" cy="11.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: "rooms",
    label: "Rooms",
    icon: (
      <svg {...iconProps}>
        <path d="M3 19V6M21 19v-6a3 3 0 0 0-3-3H3M3 15h18M7 10V8h4v2" />
      </svg>
    ),
  },
];

type Props = {
  tab: EditorTab;
  changed: EditorTab[]; // tabs with unsaved changes
  infoErrors: number; // invalid fields on Hotel information
  onSelectTab: (tab: EditorTab) => void;
  backLink?: React.ReactNode;
  mode?: "mobile" | "desktop";
};

export function EditorSidebar({ tab, changed, infoErrors, onSelectTab, backLink, mode = "desktop" }: Props) {
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const selected = TABS.find((item) => item.id === tab)!;

  function tabButton(item: (typeof TABS)[number], compact: boolean) {
    const active = item.id === tab;
    const errors = item.id === "info" ? infoErrors : 0;
    return (
      <li key={item.id}>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => {
            onSelectTab(item.id);
            if (compact) mobileMenu.current?.removeAttribute("open");
          }}
          className={`group flex w-full items-center gap-2 rounded-control border px-2.5 py-2 text-left text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-blue ${
            active ? "border-edge bg-blue/5 font-semibold text-ink" : "border-transparent text-slate hover:bg-blue/5 hover:text-ink"
          }`}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? "bg-blue text-on-blue" : "bg-blue/10 text-blue"}`}>
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">{item.label}</span>
          {errors > 0 ? (
            <span className="rounded-full border border-danger px-1.5 text-xs text-danger" aria-label={`${errors} invalid fields`}>{errors}</span>
          ) : changed.includes(item.id) ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue" aria-label="Unsaved changes" />
          ) : null}
        </button>
      </li>
    );
  }

  // Mobile navigation belongs BELOW the property title, not above it.
  // This component is rendered once per breakpoint so the desktop sidebar
  // stays in its original left column.
  if (mode === "mobile") {
    return (
      <details ref={mobileMenu} className="group mt-5 w-full min-w-0 rounded-lg border border-edge bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-blue [&::-webkit-details-marker]:hidden">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue text-on-blue">{selected.icon}</span>
          <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          <span className="font-normal text-slate">Sections</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <nav aria-label="Property sections" className="border-t border-edge p-2">
          <ul className="grid gap-1 sm:grid-cols-2">{TABS.map((item) => tabButton(item, true))}</ul>
        </nav>
      </details>
    );
  }

  return (
    <aside className="hidden w-48 shrink-0 self-start lg:sticky lg:top-6 lg:block">
      {backLink && <div>{backLink}</div>}
      <nav aria-label="Property sections" className="mt-6">
        <ul className="space-y-1">{TABS.map((item) => tabButton(item, false))}</ul>
      </nav>
    </aside>
  );
}
