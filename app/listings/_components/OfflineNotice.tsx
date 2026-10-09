import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// Tint banner while the browser reports no connection. The server render assumes online.
export function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return (
    <div role="status">
      {!online && (
        <p className="mt-6 flex items-center gap-3 rounded-lg border border-blue/20 bg-blue/10 px-4 py-3 text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-blue-dark" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />
          </svg>
          You&apos;re offline. Your edits stay here; save once you&apos;re back online.
        </p>
      )}
    </div>
  );
}
