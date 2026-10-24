// Mock photo upload, run in the browser. Real version: upload the file to a Supabase Storage bucket
// and return its public URL.
// - A sample photo (a URL from mocks/sample-photos.ts) "uploads" to its own URL, so it survives reloads.
// - A file from the computer becomes a blob: URL, which only works in this browser tab until it's closed.

// Set to true to make each upload fail on its first try, to see the "Upload failed" / Retry state.
export const MOCK_UPLOAD_FAILS_FIRST_TRY = false;

export async function uploadPhoto(source: File | string, attempt: number): Promise<{ url: string } | { error: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (MOCK_UPLOAD_FAILS_FIRST_TRY && attempt === 1) return { error: "Upload failed" };
  return { url: typeof source === "string" ? source : URL.createObjectURL(source) };
}
