import { useRef, useState } from "react";
import { Button } from "@/app/_components/ui";
import { SAMPLE_PHOTOS } from "@/mocks/sample-photos";
import type { ListingPhoto } from "@/types/listing";
import { uploadPhoto } from "@/utils/photo-upload";
import { ListingCover } from "./ListingCover";
import { PanelHeading } from "./PanelHeading";
import { PhotoMenu } from "./PhotoMenu";

const MAX_PHOTOS = 30; // same limit the server enforces

type Upload = { id: string; source: File | string; caption: string; status: "uploading" | "failed"; attempt: number };
type View = { kind: "gallery" } | { kind: "choose" } | { kind: "uploads" } | { kind: "coverUpdated"; photoId: string };

type Props = {
  photos: ListingPhoto[];
  onAddPhoto: (photo: ListingPhoto) => void;
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
export function PhotosPanel({ photos, onAddPhoto, onMakeCover, onMove, onRemove }: Props) {
  const [view, setView] = useState<View>({ kind: "gallery" });
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [picked, setPicked] = useState<string[]>([]); // sample photo URLs chosen in the picker
  const fileInput = useRef<HTMLInputElement>(null);

  function startUpload(upload: Upload) {
    uploadPhoto(upload.source, upload.attempt).then((result) => {
      if ("url" in result) {
        onAddPhoto({ id: upload.id, url: result.url, caption: upload.caption });
        setUploads((list) => list.filter((u) => u.id !== upload.id));
      } else {
        setUploads((list) => list.map((u) => (u.id === upload.id ? { ...u, status: "failed" } : u)));
      }
    });
  }

  const spaceLeft = Math.max(MAX_PHOTOS - photos.length - uploads.length, 0);

  function startUploads(items: { source: File | string; caption: string }[]) {
    const added: Upload[] = items
      .slice(0, spaceLeft)
      .map((item) => ({ ...item, id: crypto.randomUUID(), status: "uploading", attempt: 1 }));
    if (added.length === 0) return;
    setUploads((list) => [...list, ...added]);
    added.forEach(startUpload);
    setPicked([]);
    setView({ kind: "uploads" });
  }

  function addFiles(files: FileList | null) {
    const images = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    if (fileInput.current) fileInput.current.value = ""; // lets the same file be picked again
    startUploads(images.map((file) => ({ source: file, caption: captionFromFileName(file.name) })));
  }

  function addSamples() {
    startUploads(SAMPLE_PHOTOS.filter((sample) => picked.includes(sample.url)).map((s) => ({ source: s.url, caption: s.caption })));
  }

  function togglePicked(url: string) {
    setPicked((list) => (list.includes(url) ? list.filter((u) => u !== url) : [...list, url]));
  }

  function retry(upload: Upload) {
    const next: Upload = { ...upload, status: "uploading", attempt: upload.attempt + 1 };
    setUploads((list) => list.map((u) => (u.id === upload.id ? next : u)));
    startUpload(next);
  }

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
                  className={`relative block w-full rounded-lg text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue ${
                    selected ? "ring-3 ring-blue" : ""
                  }`}
                >
                  <ListingCover photo={{ id: sample.url, ...sample }} sizes="250px" className="aspect-[16/10] w-full" />
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
                  <Button onClick={() => retry(upload)}>
                    Retry<span className="sr-only">: {upload.caption}</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setUploads((list) => list.filter((u) => u.id !== upload.id))}>
                    Remove<span className="sr-only">: {upload.caption}</span>
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
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

  return (
    <>
      <PanelHeading
        title="Photos"
        subtitle="Choose a cover photo and arrange the rest of your gallery."
        action={
          <Button variant="secondary" onClick={() => setView({ kind: "choose" })} disabled={spaceLeft === 0}>
            Add photos
          </Button>
        }
      />

      {!cover ? (
        <p className="mt-8 text-slate">No photos yet. Add a few so guests can picture their stay.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
            <figure>
              <ListingCover photo={cover} sizes="(min-width: 1024px) 600px, 100vw" className="aspect-[16/10] w-full" />
              <figcaption className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-blue">Cover photo</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{cover.caption || "Untitled photo"}</p>
                  <p className="mt-1 text-slate">Shown first on your listing.</p>
                </div>
                {menu(cover, 0)}
              </figcaption>
            </figure>

            <ul className="space-y-6">
              {rest.map((photo, i) => (
                <li key={photo.id} className="flex items-center gap-4">
                  <ListingCover photo={photo} sizes="200px" className="aspect-[16/10] w-36 sm:w-44" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{photo.caption || "Untitled photo"}</p>
                    <p className="text-sm text-slate">Photo {i + 2}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onMakeCover(photo.id);
                      setView({ kind: "coverUpdated", photoId: photo.id });
                    }}
                    className="hidden text-sm text-blue hover:text-blue-dark sm:block"
                  >
                    Make cover<span className="sr-only">: {photo.caption}</span>
                  </button>
                  {menu(photo, i + 1)}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 text-sm text-slate">Use each photo&apos;s menu to reorder or remove it.</p>
        </>
      )}
    </>
  );
}
