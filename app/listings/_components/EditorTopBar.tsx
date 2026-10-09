import { Button } from "@/app/_components/ui";
import { formatLocation } from "@/lib/listing-display";
import type { HotelInfo, ListingPhoto } from "@/types/listing";
import { ListingCover } from "./ListingCover";

export type SaveStatus = { kind: "saving" | "saved" | "unsaved" | "problem"; text: string };

const STATUS_ICONS: Record<SaveStatus["kind"], React.ReactNode> = {
  saving: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" className="animate-pulse" />,
  saved: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  unsaved: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  problem: <path d="M12 4l9 16H3zM12 10v4M12 17.5h.01" />,
};

const STATUS_COLORS: Record<SaveStatus["kind"], string> = {
  saving: "text-slate",
  saved: "text-blue",
  unsaved: "text-blue",
  problem: "text-danger",
};

// Property name and location, above the save bar.
export function EditorHeader({ saved, cover, isNew }: { saved: HotelInfo; cover?: ListingPhoto; isNew: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-5">
      {!isNew && <ListingCover photo={cover} sizes="128px" className="hidden aspect-[16/10] w-32 border border-edge sm:block" />}
      <div className="min-w-0">
        <h1 className="truncate font-serif text-[40px] leading-[48px] text-ink">{isNew ? "New property" : saved.name}</h1>
        <p className="mt-1 text-slate">{isNew ? "Add your property details" : formatLocation(saved)}</p>
      </div>
    </div>
  );
}

type SaveBarProps = {
  status: SaveStatus;
  saveLabel: string;
  isSaving: boolean;
  canDiscard: boolean;
  onSave: () => void;
  onPreview: () => void;
  onDiscard: () => void;
};

// Frosted like the home page search bar, and sticky, so saving is always in reach on long forms.
export function SaveBar({ status, saveLabel, isSaving, canDiscard, onSave, onPreview, onDiscard }: SaveBarProps) {
  return (
    <div className="sticky top-3 z-20 mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-(--bar-edge) bg-surface/80 p-3 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md">
      <p role="status" className={`flex min-w-0 flex-1 basis-48 items-center gap-2 pl-2 text-sm ${STATUS_COLORS[status.kind]}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {STATUS_ICONS[status.kind]}
        </svg>
        <span className={status.kind === "problem" ? "" : "text-slate"}>{status.text}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {canDiscard && (
          <Button variant="ghost" onClick={onDiscard}>
            Discard changes
          </Button>
        )}
        <Button variant="secondary" onClick={onPreview}>
          Preview
        </Button>
        <Button loading={isSaving} onClick={onSave}>
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
