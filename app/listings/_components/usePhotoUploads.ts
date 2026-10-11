import { useRef, useState } from "react";
import type { ListingPhoto } from "@/types/listing";
import { uploadPhoto } from "@/utils/photo-upload";

export type Upload = { id: string; source: File | string; caption: string; status: "uploading" | "failed"; attempt: number };

// Photos on their way up. Held by the editor, not the Photos tab, so switching tabs doesn't lose them.
export function usePhotoUploads(onUploaded: (photo: ListingPhoto) => void) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const cancelled = useRef(new Set<string>()); // cleared by "Discard changes": their results are ignored

  function run(upload: Upload) {
    uploadPhoto(upload.source, upload.attempt)
      .catch(() => ({ error: "Upload failed" })) // a dropped connection fails the upload instead of hanging
      .then((result) => {
        if (cancelled.current.has(upload.id)) return;
        if ("url" in result) {
          onUploaded({ id: upload.id, url: result.url, caption: upload.caption });
          setUploads((list) => list.filter((u) => u.id !== upload.id));
        } else {
          setUploads((list) => list.map((u) => (u.id === upload.id ? { ...u, status: "failed" } : u)));
        }
      });
  }

  function start(items: { source: File | string; caption: string }[]) {
    const added: Upload[] = items.map((item) => ({ ...item, id: crypto.randomUUID(), status: "uploading", attempt: 1 }));
    setUploads((list) => [...list, ...added]);
    added.forEach(run);
  }

  function retry(upload: Upload) {
    const next: Upload = { ...upload, status: "uploading", attempt: upload.attempt + 1 };
    setUploads((list) => list.map((u) => (u.id === upload.id ? next : u)));
    run(next);
  }

  function remove(id: string) {
    setUploads((list) => list.filter((u) => u.id !== id));
  }

  function clear() {
    uploads.forEach((u) => cancelled.current.add(u.id));
    setUploads([]);
  }

  return { uploads, start, retry, remove, clear };
}
