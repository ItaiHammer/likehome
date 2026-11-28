"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** A skeleton on the card that was clicked, rather than a global loading toast. */
export function HomeNavigationFeedback() {
  const pathname = usePathname();
  const busy = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (busy.current) {
      busy.current.removeAttribute("data-home-nav-pending");
      busy.current.removeAttribute("aria-busy");
      busy.current.removeAttribute("data-home-nav-started");
      busy.current = null;
    }
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    const mark = (element: HTMLElement) => {
      if (busy.current && busy.current !== element) {
        busy.current.removeAttribute("data-home-nav-pending");
        busy.current.removeAttribute("aria-busy");
        busy.current.removeAttribute("data-home-nav-started");
      }
      busy.current = element;
      element.setAttribute("data-home-nav-pending", "");
      element.dataset.homeNavStarted = String(Date.now());
      element.setAttribute("aria-busy", "true");
      setPending(true);
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const element = event.target;
      if (!(element instanceof Element)) return;
      const link = element.closest<HTMLAnchorElement>("a[href]");
      if (!link?.closest("main[data-home]") || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      mark(link.closest<HTMLElement>("article") ?? link.closest<HTMLElement>("li") ?? link);
    };
    const submit = (event: Event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && form.closest("main[data-home]") && form.matches("form[data-search-bar]")) mark(form);
    };
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    const timeout = window.setInterval(() => {
      if (!busy.current) return;
      // A failed navigation should not leave a card in a loading state indefinitely.
      if (Date.now() - Number(busy.current.dataset.homeNavStarted || 0) < 10000) return;
      busy.current.removeAttribute("data-home-nav-pending");
      busy.current.removeAttribute("aria-busy");
      busy.current.removeAttribute("data-home-nav-started");
      busy.current = null;
      setPending(false);
    }, 1000);
    return () => {
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      window.clearInterval(timeout);
      if (busy.current) {
        busy.current.removeAttribute("data-home-nav-pending");
        busy.current.removeAttribute("aria-busy");
        busy.current.removeAttribute("data-home-nav-started");
      }
    };
  }, []);

  if (!pending) return null;
  return <span role="status" aria-live="polite" className="sr-only">Opening your next page…</span>;
}
