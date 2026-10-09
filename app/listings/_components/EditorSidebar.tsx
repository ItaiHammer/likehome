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
  backLink: React.ReactNode;
};

export function EditorSidebar({ tab, changed, infoErrors, onSelectTab, backLink }: Props) {
  return (
    <aside className="md:sticky md:top-6 md:w-48 md:shrink-0 md:self-start">
      {backLink}

      <nav aria-label="Property sections" className="mt-4 md:mt-6">
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1 md:flex-col md:overflow-visible">
          {TABS.map((item) => {
            const active = item.id === tab;
            const errors = item.id === "info" ? infoErrors : 0;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelectTab(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left leading-5 whitespace-nowrap transition-colors md:whitespace-normal focus-visible:outline-2 focus-visible:outline-blue ${
                    active ? "border-edge bg-surface font-semibold text-ink" : "border-transparent text-slate hover:bg-blue/5 hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                      active ? "bg-blue text-on-blue" : "bg-blue/10 text-blue group-hover:bg-blue/15"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {errors > 0 ? (
                    <span className="rounded-full border border-danger px-2 text-xs leading-5 font-semibold text-danger">
                      {errors}
                      <span className="sr-only"> {errors === 1 ? "field needs" : "fields need"} attention</span>
                    </span>
                  ) : (
                    changed.includes(item.id) && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue">
                        <span className="sr-only">Unsaved changes</span>
                      </span>
                    )
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
