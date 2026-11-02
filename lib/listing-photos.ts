// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// What the "listing-photos" Storage bucket accepts (same limits as its migration, 20261026_f3_listing_photos_bucket.sql).
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export const PHOTO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Why this file can't be uploaded, or null if it can. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Only JPG, PNG, WebP, GIF or AVIF photos can be added.";
  if (file.size > MAX_PHOTO_BYTES) return "Photos can be up to 5 MB.";
  return null;
}

const PUBLIC_PATH = "/storage/v1/object/public/listing-photos/";

/**
 * Storage paths of uploaded photos a save removed from a listing, so their files can be deleted
 * too (audit retest: a removed photo stayed publicly reachable). Only files in the owner's own
 * folder of the listing-photos bucket; sample photos and other hosts are never touched.
 */
export function removedPhotoPaths(before: readonly string[], after: readonly string[], ownerId: string): string[] {
  const kept = new Set(after);
  const paths: string[] = [];
  for (const url of new Set(before)) {
    if (kept.has(url)) continue;
    const at = url.indexOf(PUBLIC_PATH);
    if (at === -1) continue;
    const path = decodeURIComponent(url.slice(at + PUBLIC_PATH.length).split("?")[0]);
    if (path.startsWith(`${ownerId}/`) && !path.includes("..")) paths.push(path);
  }
  return paths;
}
