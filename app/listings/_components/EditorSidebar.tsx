import { formatLocation } from "@/lib/listing-display";
import type { HotelInfo, ListingPhoto } from "@/types/listing";
import type { EditorTab } from "./editor-state";
import { ListingCover } from "./ListingCover";

const iconProps = {
  viewBox: "0 0 24 24",
  className: "h-5 w-5 shrink-0",
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
  saved: HotelInfo;
  cover?: ListingPhoto;
  isNew: boolean;
  tab: EditorTab;
  onSelectTab: (tab: EditorTab) => void;
  backLink: React.ReactNode;
};

export function EditorSidebar({ saved, cover, isNew, tab, onSelectTab, backLink }: Props) {
  return (
    <aside className="border-b border-edge px-4 py-6 md:w-60 md:shrink-0 md:border-r md:border-b-0 md:px-6 md:py-8">
      {backLink}

      {/* On phones the top bar already shows the name, so this block is desktop-only */}
      <div className="mt-6 hidden md:block">
        {!isNew && <ListingCover photo={cover} sizes="192px" className="aspect-[16/9] w-full" />}
        <p className="mt-4 font-serif text-xl text-ink">{isNew ? "New property" : saved.name}</p>
        <p className="mt-2 text-sm text-blue">{isNew ? "Add your property details" : formatLocation(saved)}</p>
      </div>

      <nav aria-label="Property sections" className="mt-4 md:mt-8">
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1 md:flex-col md:overflow-visible">
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-blue ${
                    active ? "bg-blue/10 font-semibold text-ink" : "text-blue hover:bg-blue/5"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
