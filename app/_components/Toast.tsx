"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastMessage = { title: string; body?: string; tone?: "success" | "error" };

/**
 * A short note that slides in against the right edge. The live region stays mounted so screen
 * readers announce each new message; pass null to show nothing.
 */
export function Toast({ toast, onDismiss, messageKey }: { toast: ToastMessage | null; onDismiss: () => void; messageKey?: string | number }) {
  const error = toast?.tone === "error";
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 right-0 z-[80] font-sans">
      {toast && (
        <div
          key={messageKey}
          className="pointer-events-auto flex min-h-[60px] w-[min(24rem,calc(100vw-1rem))] items-center gap-3 rounded-l-lg border-y border-l border-edge bg-surface py-3 pl-6 pr-4 text-ink shadow-lg step-in sm:w-auto sm:min-w-60 sm:max-w-sm"
        >
          <span aria-hidden className={`text-base font-semibold ${error ? "text-danger" : "text-blue"}`}>
            {error ? "!" : "✓"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">{toast.title}</p>
            {toast.body && <p className="mt-1 text-sm text-slate">{toast.body}</p>}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={onDismiss}
            className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-lg text-slate hover:text-ink focus-visible:outline-2 focus-visible:outline-blue"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/** A toast that hides itself after `ms`; `initial` shows one just after mount, once the live region exists */
export function useToast(ms: number, initial: ToastMessage | null) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const first = useRef(initial);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(timer);
  }, [toast, ms]);
  const dismiss = useCallback(() => setToast(null), []);
  useEffect(() => {
    const message = first.current;
    if (!message) return;
    const frame = window.requestAnimationFrame(() => setToast(message));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return { toast, dismiss };
}
