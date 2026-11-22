"use client";

import { useState } from "react";
import { ConfirmDialog, type ConfirmRequest } from "@/app/_components/ConfirmDialog";
import { Popover } from "@/app/_components/ui";
import { sendHide } from "./messageApi";

function DotsIcon({ vertical }: { vertical?: boolean }) {
  return (
    <svg viewBox="0 0 15 15" className={`h-[15px] w-[15px] ${vertical ? "rotate-90" : ""}`} fill="currentColor" aria-hidden>
      <circle cx="1.5" cy="7.5" r="1.5" />
      <circle cx="7.5" cy="7.5" r="1.5" />
      <circle cx="13.5" cy="7.5" r="1.5" />
    </svg>
  );
}

/** The ••• button on a message, with its one item: Delete message */
export function MessageMenu({ onDelete, label, vertical }: { onDelete: () => void; label: string; vertical?: boolean }) {
  return (
    <Popover
      label={label}
      align="right"
      panelClassName="!mt-1 w-[180px] !rounded-lg !p-0 overflow-hidden"
      // The last rule hides the chevron Popover adds to every trigger
      triggerClassName="flex h-11 w-11 items-center justify-center rounded-control text-slate transition-colors hover:bg-ink/5 aria-expanded:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue dark:hover:bg-white/10 dark:aria-expanded:bg-white/10 [&>svg:last-child]:hidden"
      trigger={
        <>
          <DotsIcon vertical={vertical} />
          <span className="sr-only">{label}</span>
        </>
      }
    >
      {(close) => (
        <button
          type="button"
          onClick={() => {
            close();
            onDelete();
          }}
          className="flex h-10 w-full items-center justify-center text-base text-danger transition-colors hover:bg-danger/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue max-sm:h-11"
        >
          Delete message
        </button>
      )}
    </Popover>
  );
}

/**
 * The delete confirmation. `ask(id)` opens it; `onDone` hears back after the API answers (error null on success).
 * `pending` holds the ids whose delete is still in flight, so callers can hide those rows meanwhile.
 */
export function useDeleteMessage(onDone: (result: { id: string; error: string | null }) => void) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [pending, setPending] = useState<string[]>([]);

  function ask(id: string) {
    if (pending.includes(id)) return;
    setRequest({
      eyebrow: "Delete message",
      title: "Delete this message?",
      description: (
        <>
          This message will be <strong className="font-bold">permanently</strong> removed from your inbox.
        </>
      ),
      confirmLabel: "Delete message",
      cancelLabel: "Cancel",
      destructive: true,
      compact: true,
      onConfirm: () => {
        setPending((prev) => [...prev, id]);
        void sendHide(id).then((error) => {
          setPending((prev) => prev.filter((p) => p !== id));
          onDone({ id, error });
        });
      },
    });
  }

  return { ask, pending, dialog: <ConfirmDialog request={request} onDone={() => setRequest(null)} /> };
}
