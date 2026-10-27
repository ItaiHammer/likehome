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
