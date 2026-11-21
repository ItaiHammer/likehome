"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { API_ROUTES, PAGE_ROUTES } from "@/constants/routes";
import { badgeLabel, bellSummary, relativeTime, toInboxMessages, type BellSummary, type InboxMessage } from "@/lib/messages";
import { headerIconButtonClass as bellClass } from "./ui";
import { Popover } from "./ui";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

const noSubscribe = () => () => {};
const currentMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const noTime = () => 0;

const cascadeAt = (i: number) => ({ "--i": i }) as CSSProperties;

// `messages` is the newest few from bellSummary, bodies already shortened; `unread` covers the whole inbox
type BellData = { unread: number; messages: InboxMessage[] };

export function MessagesBell({ role, unread, messages }: { role: "personal" | "business" } & BellData) {
  if (role === "business") {
    return (
      <Link href={PAGE_ROUTES.OWNER_MESSAGES} aria-label="Messages" className={bellClass}>
        <BellIcon />
      </Link>
    );
  }
  return <InboxBell unread={unread} messages={messages} />;
}

// null for any failure, so the bell keeps what it shows
async function fetchSummary(signal: AbortSignal): Promise<BellSummary | null> {
  try {
    const res = await fetch(API_ROUTES.MESSAGES, { signal, cache: "no-store" });
    if (res.status !== 200) return null;
    const body: unknown = await res.json();
    const rows = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
    return Array.isArray(rows) ? bellSummary(toInboxMessages(rows)) : null;
  } catch {
    return null;
  }
}

// The root layout isn't re-rendered on client-side navigation, so the server's props are only a
// starting point: the bell reads the inbox again on each navigation and each time the panel opens.
// A result counts only while the props it started from are still the current ones, so newer
// server props (after router.refresh()) always replace it.
function InboxBell({ unread, messages }: BellData) {
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  const [request, setRequest] = useState<{ from: BellData } | null>(null);
  const [fetched, setFetched] = useState<{ from: BellData; summary: BellSummary } | null>(null);

  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setRequest({ from: { unread, messages } });
  }

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    void fetchSummary(controller.signal).then((summary) => {
      if (summary && !controller.signal.aborted) setFetched({ from: request.from, summary });
    });
    return () => controller.abort();
  }, [request]);

  const current = fetched && fetched.from.unread === unread && fetched.from.messages === messages ? fetched.summary : null;
  const shown = current ?? { unread, latest: messages };
  const badge = badgeLabel(shown.unread);

  // Popover doesn't say when it opens: a click on its trigger while still collapsed is an open
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const trigger = event.target instanceof Element ? event.target.closest("[aria-expanded]") : null;
    if (trigger?.getAttribute("aria-expanded") === "false" && event.currentTarget.contains(trigger)) {
      setRequest({ from: { unread, messages } });
    }
  }

  return (
    // display: contents, so the wrapper adds no box to the header row
    <div className="contents" onClickCapture={onClickCapture}>
      <Popover
        label="Messages"
        align="right"
        // Phones: the bell sits mid-header, so a panel hung from it would run off the left edge
        panelClassName="w-[min(22rem,calc(100vw-2rem))] max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:max-h-[calc(100dvh-5rem)] max-sm:w-auto max-sm:overflow-y-auto"
        // The last rule hides the chevron Popover adds to every trigger
        triggerClassName={`${bellClass} aria-expanded:bg-ink/5 dark:aria-expanded:bg-white/10 [&>svg:last-child]:hidden`}
        trigger={
          <>
            <BellIcon />
            {badge && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-none tabular-nums text-surface ring-2 ring-surface forced-colors:border"
              >
                {badge}
              </span>
            )}
            <span className="sr-only">{shown.unread > 0 ? `Messages, ${shown.unread} unread` : "Messages"}</span>
          </>
        }
      >
        {/* The header lives in the root layout, so links close the panel themselves */}
        {(close) => <InboxPanel messages={shown.latest} unread={shown.unread} close={close} />}
      </Popover>
    </div>
  );
}

// Its own component so each open re-renders it and reads a fresh "now". The server
// snapshot is 0, so no relative time is baked into the server HTML.
function InboxPanel({ messages, unread, close }: { messages: InboxMessage[]; unread: number; close: () => void }) {
  const now = useSyncExternalStore(noSubscribe, currentMinute, noTime);

  return (
    <div className="flex flex-col">
      <div className="cascade flex items-baseline justify-between gap-3 border-b border-edge pb-3" style={cascadeAt(0)}>
        <h2 className="font-serif text-2xl leading-8 text-ink">Messages</h2>
        {unread > 0 && <p className="text-sm text-slate">{unread} unread</p>}
      </div>

      {messages.length > 0 ? (
        <ul className="divide-y divide-edge">
          {messages.map((message, i) => (
            <li key={message.id} className="cascade py-1" style={cascadeAt(i + 1)}>
              <MessageLink message={message} now={now} onOpen={close} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="cascade py-6 text-sm text-slate" style={cascadeAt(1)}>
          No messages yet. Hotels you book with can message you here.
        </p>
      )}

      <div className="cascade border-t border-edge pt-3" style={cascadeAt(messages.length + 1)}>
        <Link
          href={PAGE_ROUTES.MESSAGES}
          onClick={close}
          className={`inline-block rounded-control py-1 text-base font-semibold text-blue hover:text-blue-dark ${focusRing}`}
        >
          See all messages
        </Link>
      </div>
    </div>
  );
}

function MessageLink({ message, now, onOpen }: { message: InboxMessage; now: number; onOpen: () => void }) {
  const isUnread = message.readAt === null;
  const time = now ? relativeTime(message.createdAt, new Date(now)) : "";
  return (
    <Link
      href={`${PAGE_ROUTES.MESSAGES}?m=${encodeURIComponent(message.id)}`}
      onClick={onOpen}
      className={`-mx-2 flex gap-2.5 rounded-control px-2 py-2.5 transition-colors hover:bg-ink/5 dark:hover:bg-white/10 ${focusRing}`}
    >
      <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-blue" : ""}`} />
      <span className="min-w-0 flex-1">
        {isUnread && <span className="sr-only">Unread: </span>}
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm text-slate">{message.hotelName}</span>
          {time && (
            <time dateTime={message.createdAt} className="shrink-0 text-xs text-slate">
              {time}
            </time>
          )}
        </span>
        <span className={`mt-0.5 block truncate text-base text-ink ${isUnread ? "font-semibold" : "font-normal"}`}>{message.subject}</span>
        <span className="mt-0.5 line-clamp-2 text-sm text-slate">{message.body}</span>
      </span>
    </Link>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2.5V4M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
