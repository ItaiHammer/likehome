import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export type LeaveAttempt = { leave: () => void; stay: () => void };

// While `active`, asks before leaving by closing the tab, clicking any link (header included) or pressing Back.
// `onAttempt` decides, e.g. with a dialog, then calls leave() or stay().
export function useLeaveGuard(active: boolean, onAttempt: (attempt: LeaveAttempt) => void) {
  const router = useRouter();
  const activeRef = useRef(active);
  const onAttemptRef = useRef(onAttempt);
  const onExtraEntry = useRef(false); // the current history entry is our extra copy
  const leaving = useRef(false);

  useEffect(() => {
    activeRef.current = active;
    onAttemptRef.current = onAttempt;
  });

  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!leaving.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  function addExtraEntry() {
    if (!activeRef.current || onExtraEntry.current) return;
    window.history.pushState(null, "", window.location.href);
    onExtraEntry.current = true;
  }

  // activeRef is already current here: the effect that updates it runs first
  useEffect(addExtraEntry, [active]);

  useEffect(() => {
    // Capture phase on document: runs before React's handlers, so stopping it here means <Link> never navigates.
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current || leaving.current || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab or window: nothing is lost
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return; // a full page load, which beforeunload covers
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      const href = url.pathname + url.search + url.hash;
      onAttemptRef.current({
        leave: () => {
          leaving.current = true;
          // Replace our extra entry, so Back from the next page returns here once, not twice
          if (onExtraEntry.current) router.replace(href);
          else router.push(href);
          onExtraEntry.current = false;
        },
        stay: () => {},
      });
    };

    const onPopState = () => {
      if (!onExtraEntry.current || leaving.current) return;
      onExtraEntry.current = false; // Back took us off the extra entry
      if (!activeRef.current) {
        window.history.back(); // everything was saved since: finish going back
        return;
      }
      onAttemptRef.current({
        leave: () => {
          leaving.current = true;
          window.history.back();
        },
        stay: addExtraEntry,
      });
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [router]);

  // Before a save that may navigate away (creating a property): step off the extra entry first, so the
  // page's URL matches what Next records for the request and replace() swaps out this page, not a stale copy.
  function release() {
    if (!onExtraEntry.current) return Promise.resolve();
    onExtraEntry.current = false;
    leaving.current = true; // our popstate handler ignores this Back
    return new Promise<void>((resolve) => {
      window.addEventListener("popstate", () => {
        leaving.current = false;
        resolve();
      }, { once: true });
      window.history.back();
    });
  }

  // Navigating away ourselves, e.g. to the new property's edit page.
  function replace(href: string) {
    leaving.current = true;
    router.replace(href);
  }

  // The save didn't navigate after all: guard Back again.
  const restore = addExtraEntry;

  return { release, replace, restore };
}
