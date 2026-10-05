import { useEffect, useRef } from "react";
import { Button } from "@/app/_components/ui";

type Props = {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
};

// Native <dialog> opened with showModal(): the browser traps focus inside it, closes it on Escape,
// and makes the page behind it inert.
export function DiscardDialog({ open, onKeepEditing, onDiscard }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal()/close() are browser APIs, not props, so an effect keeps them in step with `open`.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onKeepEditing}
      aria-labelledby="discard-title"
      aria-describedby="discard-description"
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-edge bg-surface p-6 text-ink backdrop:bg-disabled/90"
    >
      <h2 id="discard-title" className="text-xl font-medium">
        Discard unsaved changes?
      </h2>
      <p id="discard-description" className="mt-2 text-slate">
        Your changes will be lost if you leave this property.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onKeepEditing} autoFocus>
          Keep editing
        </Button>
        <Button variant="secondary" onClick={onDiscard}>
          Discard changes
        </Button>
      </div>
    </dialog>
  );
}
