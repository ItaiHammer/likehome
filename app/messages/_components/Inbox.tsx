"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/app/_components/ui";
import { API_ROUTES, PAGE_ROUTES } from "@/constants/routes";
import { markRead, preview, relativeTime, unreadCount, type InboxMessage } from "@/lib/messages";

// Tailwind's md breakpoint, where the list and the reader sit side by side
const SIDE_BY_SIDE = "(min-width: 48rem)";
const ROW_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

// 0 for the server render and hydration, so the server's clock and time zone never reach the
// page; the browser's time after that, ticking once a minute
let clock = 0;
function subscribeClock(onChange: () => void) {
  const tick = () => {
    clock = Date.now();
    onChange();
  };
  tick();
  const timer = window.setInterval(tick, 60_000);
  return () => window.clearInterval(timer);
}
const readClock = () => clock || (clock = Date.now());
const serverClock = () => 0;

const fullDate = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" });
function sentOn(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : fullDate.format(date);
}

type MarkOutcome = "marked" | "unconfirmed" | "signed-out" | "failed";

async function sendRead(id: string): Promise<MarkOutcome> {
  try {
    const res = await fetch(`${API_ROUTES.MESSAGES}/${encodeURIComponent(id)}/read`, { method: "PATCH" });
    if (res.ok) return "marked";
    // The route answers 400 both when the message was already read and when the update failed
    if (res.status === 400) return "unconfirmed";
    return res.status === 401 ? "signed-out" : "failed";
  } catch {
    return "failed";
  }
}

function unreadMark(messages: InboxMessage[], id: string | null): Record<string, string> {
  const message = id ? messages.find((m) => m.id === id) : undefined;
  return message && !message.readAt ? { [message.id]: new Date().toISOString() } : {};
}

function without(marks: Record<string, string>, id: string) {
  const rest = { ...marks };
  delete rest[id];
  return rest;
}

export function Inbox({ messages, initialId }: { messages: InboxMessage[]; initialId: string | null }) {
  const router = useRouter();
  const ids = useId();
  const nowMs = useSyncExternalStore(subscribeClock, readClock, serverClock);
  const now = nowMs ? new Date(nowMs) : null;

  const [selectedId, setSelectedId] = useState(initialId);
  const [seenInitialId, setSeenInitialId] = useState(initialId);
  // Messages this page has marked read, shown read before the server confirms it
  const [marks, setMarks] = useState<Record<string, string>>(() => unreadMark(messages, initialId));
  const [markError, setMarkError] = useState<{ id: string; signedOut: boolean } | null>(null);
  // Marks a 400 left in doubt; the next inbox from the server settles them
  const [unconfirmed, setUnconfirmed] = useState<string[]>([]);
  const [seenMessages, setSeenMessages] = useState(messages);
  const [opened, setOpened] = useState<{ id: string; subject: string } | null>(null);
  const [confirmed, setConfirmed] = useState(0);
  const [routing, startRouting] = useTransition();
  const sent = useRef(new Set<string>());
  const owesRefresh = useRef(false);
  const refreshing = useRef(false);
  const readerHeading = useRef<HTMLHeadingElement>(null);

  // The header bell can open another message while this page is showing
  if (initialId !== seenInitialId) {
    const mark = unreadMark(messages, initialId);
    const target = initialId !== selectedId ? messages.find((m) => m.id === initialId) : undefined;
    setSeenInitialId(initialId);
    setSelectedId(initialId);
    if (target) setOpened({ id: target.id, subject: target.subject });
    if (Object.keys(mark).length > 0) setMarks((prev) => ({ ...prev, ...mark }));
  }

  if (messages !== seenMessages) {
    setSeenMessages(messages);
    const stillUnread = unconfirmed.filter((id) => messages.some((m) => m.id === id && !m.readAt));
    if (unconfirmed.length > 0) setUnconfirmed((prev) => prev.filter((id) => !unconfirmed.includes(id)));
    if (stillUnread.length > 0) {
      setMarks((prev) => stillUnread.reduce(without, prev));
      if (selectedId && stillUnread.includes(selectedId)) setMarkError({ id: selectedId, signedOut: false });
    }
  }

  useEffect(() => {
    // A dropped mark is sent again only when its message is opened again, never on its own
    for (const id of sent.current) if (!(id in marks)) sent.current.delete(id);
    for (const id of Object.keys(marks)) {
      if (sent.current.has(id)) continue;
      sent.current.add(id);
      void sendRead(id).then((outcome) => {
        if (outcome === "marked" || outcome === "unconfirmed") {
          owesRefresh.current = true;
          setConfirmed((n) => n + 1);
        }
        if (outcome === "unconfirmed") setUnconfirmed((prev) => [...prev, id]);
        if (outcome !== "failed" && outcome !== "signed-out") return;
        setMarks((prev) => without(prev, id));
        setMarkError({ id, signedOut: outcome === "signed-out" });
      });
    }
  }, [marks]);

  // Refreshes the header bell's count. Opening a message mid-refresh replaces that refresh
  // (the router drops it for the newer navigation), so it runs again once things settle.
  useEffect(() => {
    if (routing) return;
    refreshing.current = false;
    if (!owesRefresh.current) return;
    owesRefresh.current = false;
    refreshing.current = true;
    startRouting(() => router.refresh());
  }, [routing, confirmed, router]);

  const list = useMemo(
    () => Object.entries(marks).reduce((shown, [id, at]) => markRead(shown, id, at), messages),
    [marks, messages],
  );
  const selected = list.find((m) => m.id === selectedId) ?? null;
  const unread = unreadCount(list);
  const rowId = (id: string) => `${ids}-row-${id}`;

  function navigate(href: string) {
    if (refreshing.current) owesRefresh.current = true;
    startRouting(() => router.replace(href, { scroll: false }));
  }

  function open(message: InboxMessage) {
    flushSync(() => {
      setSelectedId(message.id);
      setMarkError(null);
      if (!message.readAt) setMarks((prev) => ({ ...prev, [message.id]: new Date().toISOString() }));
    });
    if (message.id !== selectedId) navigate(`${PAGE_ROUTES.MESSAGES}?m=${encodeURIComponent(message.id)}`);
    // On phones the reader takes the list's place, so focus goes with it. Side by side, focus stays
    // in the list for arrow-key browsing and the opened message is announced instead.
    if (!window.matchMedia(SIDE_BY_SIDE).matches) readerHeading.current?.focus();
    else if (message.id !== selectedId) setOpened({ id: message.id, subject: message.subject });
  }

  function backToList() {
    const id = selectedId;
    flushSync(() => {
      setSelectedId(null);
      setMarkError(null);
    });
    navigate(PAGE_ROUTES.MESSAGES);
    if (id) document.getElementById(rowId(id))?.focus();
  }

  function moveFocus(event: React.KeyboardEvent<HTMLUListElement>) {
    if (!ROW_KEYS.has(event.key)) return;
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-message-row]"));
    const at = rows.findIndex((row) => row === document.activeElement);
    if (at === -1) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : at + (event.key === "ArrowDown" ? 1 : -1);
    rows[Math.max(0, Math.min(rows.length - 1, next))].focus();
  }

  const missingNote = selectedId !== null && !selected && (
    <p role="status" className="mb-6 flex items-center gap-3 rounded-lg border border-blue/20 bg-blue/10 px-4 py-3 text-sm text-ink">
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-blue-dark" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
      {list.length > 0 ? "That message isn’t available. Your other messages are below." : "That message isn’t available."}
    </p>
  );

  if (list.length === 0) {
    return (
      <>
        {missingNote}
        <section aria-labelledby={`${ids}-empty`} className="max-w-2xl rounded-lg border border-edge bg-surface p-8 sm:p-12">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10 text-blue">
            <EnvelopeIcon className="h-6 w-6" />
          </span>
          <h2 id={`${ids}-empty`} className="mt-5 font-serif text-[32px] leading-10 text-ink">
            No messages yet
          </h2>
          <p className="mt-3 max-w-md leading-7 text-slate">
            When a hotel you’ve booked sends you an update, like check-in details or a change to your stay, you’ll find it here.
          </p>
          <Button href={PAGE_ROUTES.SEARCH} className="mt-8">
            Browse stays
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      {missingNote}
      <div className="grid gap-6 md:grid-cols-[20rem_minmax(0,1fr)] md:items-start lg:grid-cols-[24rem_minmax(0,1fr)]">
        <section aria-labelledby={`${ids}-inbox`} className={selected ? "hidden md:block" : undefined}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`${ids}-inbox`} className="text-lg font-semibold text-ink">
              Inbox
            </h2>
            <p className="text-sm text-slate">{unread > 0 ? `${unread} unread` : "All read"}</p>
          </div>
          <ul onKeyDown={moveFocus} className="mt-3 divide-y divide-edge overflow-hidden rounded-lg border border-edge bg-surface">
            {list.map((message) => {
              const isUnread = !message.readAt;
              const isSelected = message.id === selected?.id;
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    id={rowId(message.id)}
                    data-message-row
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => open(message)}
                    className={`flex w-full gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue ${
                      isSelected ? "bg-blue/10 shadow-[inset_3px_0_0_var(--blue)]" : "hover:bg-blue/5"
                    }`}
                  >
                    <span aria-hidden className="mt-1.5 flex w-2 shrink-0 justify-center">
                      {isUnread && <span className="h-2 w-2 rounded-full bg-blue" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`min-w-0 truncate text-sm ${isUnread ? "font-semibold text-ink" : "text-slate"}`}>
                          {isUnread && <span className="sr-only">Unread, </span>}
                          {message.hotelName}
                        </span>
                        <time dateTime={message.createdAt} className="shrink-0 text-xs text-slate">
                          {now ? relativeTime(message.createdAt, now) : ""}
                        </time>
                      </span>
                      <span className={`truncate text-ink ${isUnread ? "font-semibold" : ""}`}>{message.subject}</span>
                      {message.body && <span className="line-clamp-2 text-sm text-slate">{preview(message.body)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          // Keyed so a newly opened message starts at the top. Side by side it scrolls on its own
          // while stuck, so it takes focus for keyboard scrolling.
          key={selected?.id}
          aria-label="Message"
          tabIndex={selected ? 0 : undefined}
          className={`rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue md:sticky md:top-6 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto md:overscroll-contain ${selected ? "" : "hidden md:block"}`}
        >
          {selected ? (
            <article aria-labelledby={`${ids}-subject`} className="rounded-lg border border-edge bg-surface p-6 sm:p-8">
              <Button variant="ghost" size="sm" onClick={backToList} className="-ml-3 mb-4 md:hidden">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12.5 5L7.5 10l5 5" />
                </svg>
                Back to messages
              </Button>
              <h2 id={`${ids}-subject`} ref={readerHeading} tabIndex={-1} className="break-words font-serif text-[32px] leading-10 text-ink outline-none">
                {selected.subject}
              </h2>
              <p className="mt-3 text-ink">
                From <span className="font-semibold">{selected.hotelName}</span>
              </p>
              <p className="mt-0.5 text-sm text-slate">
                <time dateTime={selected.createdAt}>{now ? sentOn(selected.createdAt) : ""}</time>
              </p>
              <div aria-live="polite">
                {markError?.id === selected.id && (
                  <p className="mt-3 text-sm text-danger">
                    {markError.signedOut ? (
                      <>
                        Your sign-in has ended, so this message is still unread.{" "}
                        <Link
                          href={`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(`${PAGE_ROUTES.MESSAGES}?m=${encodeURIComponent(selected.id)}`)}`}
                          className="font-semibold underline"
                        >
                          Sign in again
                        </Link>
                      </>
                    ) : (
                      "We couldn’t mark this message as read. It stays unread until you open it again."
                    )}
                  </p>
                )}
              </div>
              {/* Plain text: a hotel's message is never rendered as HTML */}
              <div className="mt-6 whitespace-pre-wrap break-words border-t border-edge pt-6 leading-7 text-ink">{selected.body}</div>
            </article>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-edge bg-surface p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10 text-blue">
                <EnvelopeIcon className="h-6 w-6" />
              </span>
              <p className="mt-4 font-semibold text-ink">Choose a message to read it</p>
              <p className="mt-1 text-sm text-slate">It opens here, next to your inbox.</p>
            </div>
          )}
        </section>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {/* Keyed by message, so two messages with the same subject are each announced */}
        {opened && <span key={opened.id}>{`Opened: ${opened.subject}`}</span>}
      </p>
    </>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
