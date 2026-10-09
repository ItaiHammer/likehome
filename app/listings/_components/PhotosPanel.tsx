import { useRef, useState } from "react";
import { Button } from "@/app/_components/ui";
import { MAX_PHOTOS } from "@/lib/validation/listing";
import { SAMPLE_PHOTOS } from "@/mocks/sample-photos";
import type { ListingPhoto } from "@/types/listing";
import { ListingCover } from "./ListingCover";
import { PanelHeading } from "./PanelHeading";
import { PhotoMenu } from "./PhotoMenu";
import type { Upload } from "./usePhotoUploads";

type View = { kind: "gallery" } | { kind: "choose" } | { kind: "uploads" } | { kind: "coverUpdated"; photoId: string };

type Props = {
  photos: ListingPhoto[];
  uploads: Upload[];
  onStartUploads: (items: { source: File | string; caption: string }[]) => void;
  onRetryUpload: (upload: Upload) => void;
  onRemoveUpload: (id: string) => void;
  onMakeCover: (id: string) => void;
  onMove: (id: string, by: -1 | 1) => void;
  onRemove: (id: string) => void;
};

// "new-exterior_photo.jpg" → "New exterior photo"
function captionFromFileName(name: string) {
  const words = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, 80) || "New photo";
}

// The Photos tab: the gallery, the sample-photo picker, the "Cover photo updated" confirmation, or uploads in progress.
export function PhotosPanel({ photos, uploads, onStartUploads, onRetryUpload, onRemoveUpload, onMakeCover, onMove, onRemove }: Props) {
  // Coming back to this tab mid-upload shows the uploads again
  const [view, setView] = useState<View>({ kind: uploads.length > 0 ? "uploads" : "gallery" });
  const [picked, setPicked] = useState<string[]>([]); // sample photo URLs chosen in the picker
  const [skipped, setSkipped] = useState<string | null>(null); // message about files that weren't images
  const fileInput = useRef<HTMLInputElement>(null);

  const spaceLeft = Math.max(MAX_PHOTOS - photos.length - uploads.length, 0);

  function startUploads(items: { source: File | string; caption: string }[]) {
    const added = items.slice(0, spaceLeft);
    if (added.length === 0) return;
    onStartUploads(added);
    setPicked([]);
    setView({ kind: "uploads" });
  }

  function addFiles(files: FileList | null) {
    const all = Array.from(files ?? []);
    const images = all.filter((file) => file.type.startsWith("image/"));
    if (fileInput.current) fileInput.current.value = ""; // lets the same file be picked again
    if (images.length < all.length) {
      setSkipped(images.length === 0 ? "Only image files can be added (JPG, PNG, WebP…)." : "Some files were skipped: only images can be added.");
    } else {
      setSkipped(null);
    }
    startUploads(images.map((file) => ({ source: file, caption: captionFromFileName(file.name) })));
  }

  function addSamples() {
    setSkipped(null);
    startUploads(SAMPLE_PHOTOS.filter((sample) => picked.includes(sample.url)).map((s) => ({ source: s.url, caption: s.caption })));
  }

  function togglePicked(url: string) {
    setPicked((list) => (list.includes(url) ? list.filter((u) => u !== url) : [...list, url]));
  }

  const skippedNotice = skipped && (
    <p role="alert" className="mt-4 text-sm text-danger">
      {skipped}
    </p>
  );

  const picker = (
    <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
  );
  const backToGallery = (
    <Button variant="secondary" className="mt-8" onClick={() => setView({ kind: "gallery" })}>
      Back to gallery
    </Button>
  );

  if (view.kind === "choose") {
    return (
      <>
        {picker}
        <PanelHeading title="Add photos" subtitle="Pick sample photos for now. Real uploads come once photo storage is set up." />
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SAMPLE_PHOTOS.map((sample) => {
            const selected = picked.includes(sample.url);
            return (
              <li key={sample.url}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => togglePicked(sample.url)}
                  className={`group relative block w-full rounded-lg text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue ${
                    selected ? "ring-3 ring-blue" : ""
                  }`}
                >
                  <ListingCover photo={{ id: sample.url, ...sample }} sizes="250px" zoom className="aspect-[16/10] w-full" />
                  {selected && (
                    <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue text-on-blue" aria-hidden>
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5.5 10.5l3 3 6-7" />
                      </svg>
                    </span>
                  )}
                  <span className="mt-2 block text-sm text-ink">{sample.caption}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={addSamples} disabled={picked.length === 0}>
            {picked.length > 1 ? `Add ${picked.length} photos` : "Add photo"}
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Upload from your computer
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPicked([]);
              setView({ kind: "gallery" });
            }}
          >
            Cancel
          </Button>
        </div>
        {skippedNotice}
        {spaceLeft < picked.length && (
          <p className="mt-4 text-sm text-slate">Only the first {spaceLeft} will be added: listings can have up to {MAX_PHOTOS} photos.</p>
        )}
      </>
    );
  }

  if (view.kind === "coverUpdated") {
    const photo = photos.find((p) => p.id === view.photoId);
    return (
      <>
        <PanelHeading title="Cover photo updated" subtitle={`${photo?.caption || "This photo"} will be shown first on your listing.`} />
        <ListingCover photo={photo} sizes="(min-width: 1024px) 1000px, 100vw" className="mt-8 aspect-[16/7] w-full" />
        {backToGallery}
      </>
    );
  }

  if (view.kind === "uploads") {
    return (
      <>
        <PanelHeading title="Adding photos" subtitle="Your uploaded photos appear in the gallery when they are ready." />
        <ul aria-live="polite" className="mt-8 space-y-6">
          {uploads.map((upload) => (
            <li key={upload.id}>
              <p className={upload.status === "failed" ? "text-danger" : "text-ink"}>
                {upload.caption} — {upload.status === "failed" ? "Upload failed. Try again." : "Uploading..."}
              </p>
              {upload.status === "failed" && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => onRetryUpload(upload)}>
                    Retry<span className="sr-only">: {upload.caption}</span>
                  </Button>
                  <Button variant="secondary" onClick={() => onRemoveUpload(upload.id)}>
                    Remove<span className="sr-only">: {upload.caption}</span>
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {skippedNotice}
        {uploads.length === 0 && <p className="mt-8 text-slate">All your new photos are in the gallery.</p>}
        {backToGallery}
      </>
    );
  }

  const [cover, ...rest] = photos;
  const menu = (photo: ListingPhoto, index: number) => (
    <PhotoMenu
      caption={photo.caption || `Photo ${index + 1}`}
      index={index}
      count={photos.length}
      onMakeCover={() => {
        onMakeCover(photo.id);
        setView({ kind: "coverUpdated", photoId: photo.id });
      }}
      onMove={(by) => onMove(photo.id, by)}
      onRemove={() => onRemove(photo.id)}
    />
  );

  // Dashed "+" tile in the next photo's spot; opens the same picker the old "Add photos" button did
  const addTile = (className: string, label: string, hint: string, hintClass = "") => (
    <button
      type="button"
      onClick={() => setView({ kind: "choose" })}
      className={`group/add flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-edge p-3 text-center transition-colors hover:border-blue hover:bg-blue/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${className}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue transition-colors group-hover/add:bg-blue group-hover/add:text-on-blue">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M10 4v12M4 10h12" />
        </svg>
      </span>
      <span className="font-semibold text-ink">{label}</span>
      <span className={`text-sm text-slate ${hintClass}`}>{hint}</span>
    </button>
  );
  const canAdd = spaceLeft > 0;

  return (
    <>
      <PanelHeading title="Photos" subtitle="Choose a cover photo and arrange the rest of your gallery." />
      {photos.length >= MAX_PHOTOS && (
        <p className="mt-4 text-sm text-slate">Listings can have up to {MAX_PHOTOS} photos. Remove one to add another.</p>
      )}

      {!cover ? (
        canAdd ? (
          <div className="mt-8">{addTile("aspect-[16/9]", "Add your first photo", "It becomes your cover photo")}</div>
        ) : (
          <p className="mt-8 text-slate">Your photos are uploading.</p>
        )
      ) : (
        <>
          <figure className="group mt-8">
            <ListingCover photo={cover} sizes="(min-width: 1024px) 900px, 100vw" zoom eager className="aspect-[16/9] w-full" />
            <figcaption className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue">Cover photo</p>
                <p className="mt-1 truncate text-lg font-semibold text-ink">{cover.caption || "Untitled photo"}</p>
                <p className="mt-1 text-slate">Shown first on your listing.</p>
              </div>
              {menu(cover, 0)}
            </figcaption>
          </figure>

          {(rest.length > 0 || canAdd) && (
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              {rest.map((photo, i) => (
                <li key={photo.id} className="group min-w-0">
                  <ListingCover photo={photo} sizes="(min-width: 640px) 300px, 50vw" zoom className="aspect-[16/10] w-full" />
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{photo.caption || "Untitled photo"}</p>
                      <p className="text-sm text-slate">Photo {i + 2}</p>
                    </div>
                    {menu(photo, i + 1)}
                  </div>
                </li>
              ))}
              {canAdd && <li>{addTile("aspect-[16/10]", "Add photos", "From samples or your computer", "hidden lg:block")}</li>}
            </ul>
          )}
          <p className="mt-8 text-sm text-slate">Use each photo&apos;s ••• menu to make it the cover, reorder it or remove it.</p>
        </>
      )}
    </>
  );
}
