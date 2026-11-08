// Listing photo upload, run in the browser (audit F3).
// - A file from the computer goes to the public "listing-photos" Storage bucket, in the signed-in
//   owner's own folder, and the photo keeps its public URL (supabase/migrations/20261026_f3_listing_photos_bucket.sql).
// - A sample photo (a URL from mocks/sample-photos.ts) is already hosted, so it keeps its own URL.
import { createClient } from "@/utils/supabase/client";
import { PHOTO_EXTENSION, photoProblem } from "@/lib/listing-photos";

export const PHOTO_BUCKET = "listing-photos";

// `attempt` is unused now (the mock used it to fail the first try); kept so retries call it the same way.
export async function uploadPhoto(source: File | string, attempt: number): Promise<{ url: string } | { error: string }> {
  void attempt;
  if (typeof source === "string") return { url: source };

  const problem = photoProblem(source);
  if (problem) return { error: problem };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sign in again to add photos." };

  const path = `${auth.user.id}/${crypto.randomUUID()}.${PHOTO_EXTENSION[source.type]}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, source, {
    contentType: source.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { error: "Upload failed" };

  return { url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
}
