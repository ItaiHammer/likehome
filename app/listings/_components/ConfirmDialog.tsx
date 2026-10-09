import { useEffect, useRef } from "react";
import { Button } from "@/app/_components/ui";

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

// Native <dialog> opened with showModal(): the browser traps focus inside it, closes it on Escape,
// and makes the page behind it inert. `request` null = closed.
export function ConfirmDialog({ request, onDone }: { request: ConfirmRequest | null; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal()/close() are browser APIs, not props, so an effect keeps them in step with `request`.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const cancel = () => {
    request?.onCancel?.();
    onDone();
  };

  return (
    <dialog
      ref={ref}
      // Fires on Escape, and also after we close it ourselves (request is null by then, so nothing runs twice)
      onClose={() => request && cancel()}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-edge bg-surface p-6 text-ink shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop:bg-disabled/90"
    >
      {request && (
        <>
          <h2 id="confirm-title" className="text-xl font-semibold">
            {request.title}
          </h2>
          <p id="confirm-description" className="mt-2 text-slate">
            {request.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={cancel} autoFocus>
              {request.cancelLabel}
            </Button>
            <Button
              variant="secondary"
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
