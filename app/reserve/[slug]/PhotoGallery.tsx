"use client";

import { useEffect, useRef, useState } from "react";
import { iconButton } from "../../_components/ui";

// The small tiles beside the main picture, by how many fit: four in a 2×2 block, or one column of two
// (or one tall tile) when a hotel has only a few photos. Corners round off the gallery's outer edge.
const LAYOUTS: Record<number, { grid: string; tiles: string[] }> = {
  4: { grid: "lg:grid-cols-4", tiles: ["rounded-control", "rounded-control rounded-tr-2xl", "rounded-control", "rounded-control rounded-br-2xl"] },
  2: { grid: "lg:grid-cols-3", tiles: ["rounded-control rounded-tr-2xl", "rounded-control rounded-br-2xl"] },
  1: { grid: "lg:grid-cols-3", tiles: ["rounded-control rounded-r-2xl lg:row-span-2"] },
  0: { grid: "", tiles: [] },
};
const PLACEHOLDER_COUNT = 5;

// Bare chevrons in the viewer: a roomy hit area around a mark that grows on hover.
const arrowClass =
  "group/arrow inline-flex h-14 w-14 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/70";

// The stay's photos, or numbered placeholders when it has none.
export function PhotoGallery({ stayName, photos = [] }: { stayName: string; photos?: string[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const count = photos.length || PLACEHOLDER_COUNT;
  const layout = LAYOUTS[count >= 5 ? 4 : count >= 3 ? 2 : count - 1];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start focus on the dialog, not the first arrow, so no ring shows until someone tabs.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const step = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + count) % count));

  function onKey(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else return;
    e.preventDefault();
  }

  const slide = (i: number, large?: boolean) =>
    photos.length ? <Photo src={photos[i]} /> : <Placeholder n={i + 1} large={large} />;

  return (
    <>
      <div className={`mt-6 grid gap-3 lg:h-[400px] lg:grid-rows-2 ${layout.grid}`}>
        <button
          type="button"
          onClick={() => setIndex(0)}
          aria-label={`Open photo 1 of ${count} of ${stayName}`}
          className={`group relative aspect-[664/464] overflow-hidden rounded-2xl border border-edge bg-surface outline-none transition-colors hover:border-blue focus-visible:border-blue focus-visible:ring-1 focus-visible:ring-blue lg:row-span-2 lg:aspect-auto ${
            layout.tiles.length ? "lg:col-span-2 lg:rounded-r-control" : ""
          }`}
        >
          {slide(0, true)}
          {count > 1 && (
            <span className="absolute bottom-3 right-3 rounded-control border border-edge bg-surface px-2.5 py-1 text-sm font-semibold text-ink lg:hidden">
              {count} photos
            </span>
          )}
        </button>
        {layout.tiles.map((corners, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i + 1)}
            aria-label={`Open photo ${i + 2} of ${count} of ${stayName}`}
            className={`group relative hidden overflow-hidden border border-edge bg-surface outline-none transition-colors hover:border-blue focus-visible:border-blue focus-visible:ring-1 focus-visible:ring-blue lg:block ${corners}`}
          >
            {slide(i + 1)}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        tabIndex={-1}
        aria-label={`Photos of ${stayName}`}
        onClose={() => setIndex(null)}
        onKeyDown={onKey}
        onClick={(e) => e.target === e.currentTarget && setIndex(null)}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-0 outline-none backdrop:bg-[rgba(30,44,90,0.95)]"
      >
        {open && (
          <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-4 px-4 py-6 sm:px-20">
            <div className="pointer-events-auto relative aspect-[3/2] w-full max-w-5xl max-h-[calc(100dvh-8rem)] overflow-hidden rounded-2xl border border-edge bg-surface">
              {photos.length ? <Photo src={photos[index]} alt={`Photo ${index + 1} of ${stayName}`} /> : <Placeholder n={index + 1} large />}
            </div>
            <p className="pointer-events-auto text-base font-semibold tabular-nums text-white" aria-live="polite">
              {index + 1} / {count}
            </p>
            {count > 1 && (
              <div className="pointer-events-auto flex gap-3 sm:contents">
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => step(-1)}
                  className={`${arrowClass} sm:absolute sm:left-4 sm:top-1/2 sm:-translate-y-1/2`}
                >
                  <Chevron d="M15 6l-6 6 6 6" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => step(1)}
                  className={`${arrowClass} sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2`}
                >
                  <Chevron d="M9 6l6 6-6 6" />
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label="Close photos"
              onClick={() => setIndex(null)}
              className={`${iconButton} pointer-events-auto absolute right-4 top-4 sm:right-6 sm:top-6`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}

// The gallery buttons carry the label, so tile photos have empty alt text.
function Photo({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    // A plain <img>: next.config doesn't list the photo hosts yet (same as the search cards).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
  );
}

function Placeholder({ n, large }: { n: number; large?: boolean }) {
  return (
    <span className="flex h-full w-full items-center justify-center text-slate transition-colors group-hover:text-blue">
      <svg
        viewBox="0 0 24 24"
        className={large ? "h-12 w-12" : "h-6 w-6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
      </svg>
      <span
        aria-hidden
        className="absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-edge px-1.5 text-sm font-semibold tabular-nums text-ink"
      >
        {n}
      </span>
    </span>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9 transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/arrow:scale-125 group-active/arrow:scale-110 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
