"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/_components/ui";

export type ConfirmRequest = {
  eyebrow?: string;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** 400px wide with the title, text and buttons centred (the Message Hub delete) */
  compact?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

// Native modal dialog: traps focus and makes the rest of the page inert.
export function ConfirmDialog({
  request,
  onDone,
}: {
  request: ConfirmRequest | null;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  function cancel() {
    request?.onCancel?.();
    onDone();
  }

  return (
    <dialog
      ref={ref}
      onClose={() => request && cancel()}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className={`m-auto ${request?.compact ? "w-[min(25rem,calc(100%-2rem))] text-center" : "w-[min(32rem,calc(100%-2rem))]"} rounded-2xl border border-edge bg-surface p-6 font-sans text-ink shadow-xl backdrop:bg-black/70 sm:p-8`}
    >
      {request && (
        <>
          <div className="flex items-start justify-between gap-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-blue-dark">
              {request.eyebrow ?? "Please confirm"}
            </p>
            <button
              type="button"
              onClick={cancel}
              aria-label="Close confirmation"
              className={`rounded-full text-slate transition-colors focus-visible:outline-2 focus-visible:outline-blue ${
                request.compact
                  ? "relative flex h-[25px] w-[25px] items-center justify-center bg-disabled after:absolute after:-inset-2.5 hover:opacity-80"
                  : "p-1.5 hover:bg-blue/10"
              }`}
            >
              <svg viewBox="0 0 24 24" className={request.compact ? "h-3.5 w-3.5" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 id="confirm-title" className={`mt-3 font-serif text-[32px] leading-[1.12] text-ink ${request.compact ? "" : "sm:text-[36px]"}`}>
            {request.title}
          </h2>
          <p id="confirm-description" className={`mt-4 leading-6 ${request.compact ? "text-sm text-ink" : "text-base text-slate"}`}>
            {request.description}
          </p>

          <div className={`mt-7 flex flex-wrap items-center gap-3 ${request.compact ? "justify-center" : "justify-end"}`}>
            <Button variant="ghost" size={request.compact ? "sm" : "md"} className={request.compact ? "!text-ink" : ""} onClick={cancel} autoFocus>
              {request.cancelLabel}
            </Button>
            <Button
              size={request.compact ? "sm" : "md"}
              className={request.destructive ? "!bg-danger !text-on-blue hover:!opacity-90" : ""}
              onClick={() => {
                request.onConfirm();
                onDone();
              }}
            >
              {request.confirmLabel}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
