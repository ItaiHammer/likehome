"use client";

import { useEffect } from "react";
import { Toast, useToast, type ToastMessage } from "@/app/_components/Toast";

type CreationKind = "created" | "sample" | null;

const COPY: Record<Exclude<CreationKind, null>, ToastMessage> = {
  sample: { title: "Sample property created", body: "Saved in this browser only. Your property is not published or bookable." },
  created: { title: "Property created", body: "Your property is now on My listings." },
};

export function ListingCreationToast({ kind }: { kind: CreationKind }) {
  const { toast, dismiss } = useToast(15000, kind ? COPY[kind] : null);

  useEffect(() => {
    if (!kind) return;

    // Avoid displaying the success notification again if the page is refreshed.
    const url = new URL(window.location.href);
    if (url.searchParams.has("created")) {
      url.searchParams.delete("created");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [kind]);

  return <Toast toast={toast} onDismiss={dismiss} />;
}
