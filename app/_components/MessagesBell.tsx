"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { API_ROUTES, PAGE_ROUTES } from "@/constants/routes";
import { bellSummary, KIND_LABEL, mailBadge, relativeTime, toInboxMessages, type BellSummary, type InboxMessage, type MessageKind } from "@/lib/messages";
import { ArrowIcon, arrowSlideClass, headerIconButtonClass as bellClass, Popover, sectionLinkClass } from "./ui";
import { useCurrentMinute } from "./useCurrentMinute";
import { getAccountSnapshot, subscribeAccount, UNKNOWN_ACCOUNT } from "./accountChange";

const focusRing = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue";

const cascadeAt = (i: number) => ({ "--i": i }) as CSSProperties;

const NO_MESSAGES: BellSummary = { unreadDirect: 0, unreadPromotional: 0, direct: [], promotional: [] };

// Travelers only; `summary` is null when the server couldn't read the inbox
export function MessagesBell({ summary, accountId }: { summary: BellSummary | null; accountId: string }) {
  const identity = useSyncExternalStore(subscribeAccount, getAccountSnapshot, () => UNKNOWN_ACCOUNT);
  const changedAccount = identity.accountId !== undefined && identity.accountId !== accountId;

  // Never reuse server props belonging to a previous account, even while its refresh is pending.
  if (changedAccount) return null;
  return <InboxBell key={`${accountId}:${identity.version}`} summary={summary} />;
}

type SummaryResult = { kind: "loaded"; summary: BellSummary } | { kind: "unauthorized" } | { kind: "failed" };

async function fetchSummary(signal: AbortSignal): Promise<SummaryResult> {
  try {
    const res = await fetch(API_ROUTES.MESSAGES, { signal, cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { kind: "unauthorized" };
    if (res.status !== 200) return { kind: "failed" };
    const body: unknown = await res.json();
    const rows = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
    return Array.isArray(rows) ? { kind: "loaded", summary: bellSummary(toInboxMessages(rows)) } : { kind: "failed" };
  } catch {
    return { kind: "failed" };
  }
}

type Request = { from: BellSummary | null };

// The root layout isn't re-rendered on client-side navigation, so the server's props are only a
// starting point: the bell reads the inbox again on each navigation and each time the panel opens.
// A result counts only while the props it started from are still the current ones, so newer
// server props (after router.refresh()) always replace it. A failed read keeps what's shown.
function InboxBell({ summary }: { summary: BellSummary | null }) {
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  const [request, setRequest] = useState<Request | null>(null);
  const [settled, setSettled] = useState<Request | null>(null);
  const [fetched, setFetched] = useState<{ from: BellSummary | null; summary: BellSummary | null } | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setRequest({ from: summary });
  }

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    void fetchSummary(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.kind === "loaded") {
        setUnauthorized(false);
        setFetched({ from: request.from, summary: result.summary });
      }
      // Unlike a temporary read failure, lost authorization must discard the old private previews.
      else if (result.kind === "unauthorized") {
        setUnauthorized(true);
        setFetched(null);
      }
      setSettled(request);
    });
    return () => controller.abort();
  }, [request]);

  // A stale RSC refresh cannot resurrect previews after a denied read. Only a successful
  // request (or a new account/version's remount) can establish authorization again.
  const shown = unauthorized ? null : fetched && fetched.from === summary ? fetched.summary : summary;
  const loading = shown === null && request !== null && settled !== request;
  const badge = mailBadge(shown ?? NO_MESSAGES);
  const reload = () => setRequest({ from: summary });

  // Popover doesn't say when it opens: a click on its trigger while still collapsed is an open
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const trigger = event.target instanceof Element ? event.target.closest("[aria-expanded]") : null;
    if (trigger?.getAttribute("aria-expanded") === "false" && event.currentTarget.contains(trigger)) reload();
  }

  return (
    // display: contents, so the wrapper adds no box to the header row. On phones the Popover's root
    // is made static so the panel hangs from the header (which is relative) and scrolls away with it.
    <div className="contents max-sm:[&>div]:static" onClickCapture={onClickCapture}>
      <Popover
        label="Messages"
        align="right"
        // Phones: the icon sits mid-header, so a panel hung from it would run off the left edge
        panelClassName="w-[min(300px,calc(100vw-2rem))] !px-[25px] !pb-3 !pt-3 max-sm:inset-x-4 max-sm:max-h-[calc(100dvh-5rem)] max-sm:w-auto max-sm:overflow-y-auto"
        // The last rule hides the chevron Popover adds to every trigger
        triggerClassName={`${bellClass} aria-expanded:bg-ink/5 dark:aria-expanded:bg-white/10 [&>svg:last-child]:hidden`}
        trigger={
          <>
            <MailIcon />
            {(badge.count || badge.dot) && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-blue px-[3px] text-xs leading-none tabular-nums text-on-blue ring-2 ring-surface forced-colors:border"
              >
                {badge.count}
              </span>
            )}
            <span className="sr-only">{badge.label}</span>
          </>
        }
      >
        {/* The header lives in the root layout, so links close the panel themselves */}
        {(close) => <InboxPanel summary={shown} loading={loading} onRetry={reload} close={close} />}
      </Popover>
    </div>
  );
}

// Its own component so each open re-renders it and reads a fresh "now"
function InboxPanel({ summary, loading, onRetry, close }: { summary: BellSummary | null; loading: boolean; onRetry: () => void; close: () => void }) {
  const now = useCurrentMinute();
  const sections = (["direct", "promotional"] as MessageKind[]).filter((kind) => summary && summary[kind].length > 0);

  return (
    <div className="flex flex-col">
      <div className="cascade flex items-center justify-between gap-3 pb-2" style={cascadeAt(0)}>
        <h2 className="text-sm text-ink">Messages</h2>
        <Link href={PAGE_ROUTES.MESSAGES} onClick={close} className={`${sectionLinkClass} text-sm`}>
          View all
          <ArrowIcon className={arrowSlideClass} />
        </Link>
      </div>

      {loading ? (
        <div className="border-t border-edge py-3">
          <p role="status" className="sr-only">
            Loading your messages…
          </p>
          <div aria-hidden className="animate-pulse space-y-4 motion-reduce:animate-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5 pl-[17px]">
                <div className="h-3.5 w-28 rounded bg-disabled" />
                <div className="h-3.5 w-40 rounded bg-disabled" />
                <div className="h-3.5 w-36 rounded bg-disabled" />
              </div>
            ))}
          </div>
        </div>
      ) : !summary ? (
        <div role="alert" className="cascade border-t border-edge py-4" style={cascadeAt(1)}>
          <p className="text-sm text-ink">We couldn’t load your messages.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 rounded-control text-sm font-semibold text-blue-dark hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue max-sm:min-h-11"
          >
            Try again
          </button>
        </div>
      ) : sections.length === 0 ? (
        <p className="cascade border-t border-edge py-6 text-sm text-slate" style={cascadeAt(1)}>
          No messages yet.
        </p>
      ) : (
        sections.map((kind, i) => (
          <section key={kind} aria-label={KIND_LABEL[kind]} className="cascade border-t border-edge pt-2" style={cascadeAt(i + 1)}>
            <h3 aria-hidden className="text-sm text-slate">
              {KIND_LABEL[kind]}
            </h3>
            <ul className="pb-1">
              {summary[kind].map((message) => (
                <li key={message.id}>
                  <MessageLink message={message} now={now} onOpen={close} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function MessageLink({ message, now, onOpen }: { message: InboxMessage; now: number; onOpen: () => void }) {
  const isUnread = message.readAt === null;
  const time = now ? relativeTime(message.createdAt, new Date(now)) : "";
  return (
    <Link
      href={`${PAGE_ROUTES.MESSAGES}/${encodeURIComponent(message.id)}`}
      onClick={onOpen}
      className={`-mx-2 grid grid-cols-[9px_minmax(0,1fr)_auto] gap-x-2 rounded-control px-2 py-2 transition-colors hover:bg-ink/5 dark:hover:bg-white/10 ${focusRing}`}
    >
      <span aria-hidden className={`mt-[5px] h-[9px] w-[9px] rounded-full ${isUnread ? "bg-blue" : ""}`} />
      <span className="min-w-0 text-sm leading-[18px] text-ink">
        {isUnread && <span className="sr-only">Unread: </span>}
        <span className="block truncate font-medium">{message.hotelName}</span>
        <span className="block truncate">{message.subject}</span>
        {message.body && <span className="block truncate">{message.body}</span>}
      </span>
      {time && (
        <time dateTime={message.createdAt} className="self-center text-sm text-ink">
          {time}
        </time>
      )}
    </Link>
  );
}

// fluent:mail-28-regular
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M4.932 3.429a3.214 3.214 0 0 0-3.214 3.214V16.5a3.214 3.214 0 0 0 3.214 3.214h14.14a3.214 3.214 0 0 0 3.214-3.214V6.643a3.214 3.214 0 0 0-3.214-3.214H4.932ZM3.003 6.643c0-1.065.864-1.929 1.929-1.929h14.14c1.064 0 1.928.864 1.928 1.929v.668L12 11.92 3.003 7.312v-.669Zm0 2.114 8.704 4.458a.643.643 0 0 0 .586 0L21 8.756V16.5a1.929 1.929 0 0 1-1.929 1.929H4.933A1.929 1.929 0 0 1 3.004 16.5l-.001-7.743Z" />
    </svg>
  );
}
