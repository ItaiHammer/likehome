import { useEffect, useRef } from "react";
import { Button } from "@/app/_components/ui";

export type ConfirmRequest = {
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
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
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-edge bg-surface p-6 font-sans text-ink shadow-xl backdrop:bg-black/70 sm:p-8"
    >
      {request && (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-blue-dark">
              {request.eyebrow ?? "Please confirm"}
            </p>
            <button
              type="button"
              onClick={cancel}
              aria-label="Close confirmation"
              className="rounded-full p-1.5 text-slate transition-colors hover:bg-blue/10 focus-visible:outline-2 focus-visible:outline-blue"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 id="confirm-title" className="mt-3 font-serif text-[32px] leading-[1.12] text-ink sm:text-[36px]">
            {request.title}
          </h2>
          <p id="confirm-description" className="mt-4 text-base leading-6 text-slate">
            {request.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" onClick={cancel} autoFocus>
              {request.cancelLabel}
            </Button>
            <Button
              className={request.destructive ? "!bg-danger !text-white hover:!opacity-90" : ""}
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
