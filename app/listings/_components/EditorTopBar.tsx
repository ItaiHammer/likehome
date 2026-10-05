import { Button } from "@/app/_components/ui";
import { formatLocation } from "@/lib/listing-display";
import type { HotelInfo, ListingPhoto } from "@/types/listing";
import { ListingCover } from "./ListingCover";

type Props = {
  saved: HotelInfo;
  cover?: ListingPhoto;
  isNew: boolean;
  status: string;
  saveLabel: string;
  isSaving: boolean;
  onSave: () => void;
  onPreview: () => void;
};

export function EditorTopBar({ saved, cover, isNew, status, saveLabel, isSaving, onSave, onPreview }: Props) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-6">
        {!isNew && <ListingCover photo={cover} sizes="160px" className="hidden aspect-[16/9] w-40 sm:block" />}
        <div className="min-w-0">
          <h1 className="truncate text-[1.75rem] leading-9 font-medium text-ink">{isNew ? "New property" : saved.name}</h1>
          <p className="mt-1 text-blue">{isNew ? "Add your property details" : formatLocation(saved)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <p role="status" className="text-sm text-slate">
          {status}
        </p>
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
