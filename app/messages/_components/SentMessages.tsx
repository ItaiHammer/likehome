"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Button, Card, IconButton, Select, Tag } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { plural } from "@/lib/listing-display";
import { preview, relativeTime, type SentMessage } from "@/lib/messages";

type Hotel = { id: string; name: string };

const MINUTE = 60_000;
// Rounded to the minute so the snapshot stays stable between renders
const currentMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE;
const subscribeMinute = (onTick: () => void) => {
  const timer = window.setInterval(onTick, 30_000);
  return () => window.clearInterval(timer);
};

const sentHref = (hotelId: string) => `${PAGE_ROUTES.MESSAGES}?hotel=${encodeURIComponent(hotelId)}`;
const composeHref = (hotelId: string) => `${PAGE_ROUTES.MESSAGES_NEW}?hotel=${encodeURIComponent(hotelId)}`;

function readStatus({ recipients, read }: SentMessage) {
  if (read <= 0) return "Not read yet";
  if (read >= recipients) return recipients === 1 ? "Read" : "Read by everyone";
  return `Read by ${read} of ${recipients}`;
}

export function SentMessages({
  hotels,
  hotelId,
  sent,
  justSent,
}: {
  hotels: Hotel[];
  hotelId: string | null;
  sent: SentMessage[];
  justSent: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = hotels.find((h) => h.id === hotelId) ?? hotels[0];
  const [shownHotelId, setShownHotelId] = useOptimistic(current?.id ?? "");
  const [dismissed, setDismissed] = useState(false);
  const now = useSyncExternalStore(subscribeMinute, currentMinute, () => 0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (!current) return <NoHotels />;

  function pickHotel(id: string) {
    startTransition(() => {
      setShownHotelId(id);
      router.push(sentHref(id));
    });
  }

  function dismissNotice() {
    setDismissed(true);
    // Drop ?sent= so a reload doesn't show the notice again
    const url = new URL(window.location.href);
    url.searchParams.delete("sent");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    headingRef.current?.focus();
  }

  return (
    <section aria-labelledby="sent-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {hotels.length > 1 ? (
          <Select
            id="sent-hotel"
            label="Hotel"
            value={shownHotelId}
            onChange={(e) => pickHotel(e.target.value)}
            options={hotels.map((h) => ({ value: h.id, label: h.name }))}
            className="w-full sm:max-w-sm"
          />
        ) : (
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink">From</p>
            <p className="mt-1 break-words text-lg text-ink">{current.name}</p>
          </div>
        )}
        <Button href={composeHref(shownHotelId)} className="shrink-0 self-start sm:self-auto">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M10 4v12M4 10h12" />
          </svg>
          New message
        </Button>
      </div>

      {justSent !== null && justSent > 0 && !dismissed && <SentNotice count={justSent} onDismiss={dismissNotice} />}

      <div>
        <h2 id="sent-heading" ref={headingRef} tabIndex={-1} className="font-serif text-[32px] leading-10 text-ink outline-none">
          Sent messages
        </h2>
        <p className="sr-only" aria-live="polite">
          {pending ? "Loading messages…" : ""}
        </p>
        <div aria-busy={pending || undefined} className={`mt-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
          {sent.length > 0 ? (
            <ul className="space-y-3">
              {sent.map((message) => (
                <SentItem key={message.key} message={message} now={now} />
              ))}
            </ul>
          ) : (
            <Card>
              <p className="text-lg font-semibold text-ink">You haven’t sent any messages from this hotel yet.</p>
              <p className="mt-1 text-sm text-slate">Send guests check-in details, a welcome note or an update about their stay.</p>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function SentItem({ message, now }: { message: SentMessage; now: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const when = now ? relativeTime(message.sentAt, new Date(now)) : "";
  const sentOn = now ? new Date(message.sentAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : undefined;
  const everyone = message.read >= message.recipients;

  return (
    <li className="rounded-lg border border-edge bg-surface transition-colors hover:border-blue/50 has-focus-visible:border-blue has-focus-visible:ring-1 has-focus-visible:ring-blue">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-4 rounded-lg p-4 text-left outline-hidden sm:p-5"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="min-w-0 break-words text-lg font-semibold text-ink">{message.subject}</span>
              <time dateTime={message.sentAt} title={sentOn} className="shrink-0 text-sm text-slate">
                {when}
              </time>
            </span>
            {!open && message.body && <span className="mt-1 block break-words text-slate">{preview(message.body)}</span>}
            <span className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate">
              <span>To {plural(message.recipients, "guest")}</span>
              <span aria-hidden>·</span>
              <Tag tone={everyone ? "blue" : "neutral"}>{readStatus(message)}</Tag>
            </span>
          </span>
          <svg
            viewBox="0 0 20 20"
            className={`mt-1.5 h-4 w-4 shrink-0 text-slate transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5.5 7.5L10 12l4.5-4.5" />
          </svg>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="border-t border-edge px-4 pb-5 pt-4 sm:px-5">
        <p className="whitespace-pre-wrap break-words leading-7 text-ink">{message.body}</p>
      </div>
    </li>
  );
}

function SentNotice({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  // The status region has to exist before its text arrives, or screen readers may skip it
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue/20 bg-blue/10 py-2 pl-4 pr-2">
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-blue-dark" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <p role="status" className="min-w-0 flex-1 font-semibold text-ink">
        {ready ? `Sent to ${plural(count, "guest")}.` : ""}
      </p>
      <IconButton label="Dismiss" size="sm" onClick={onDismiss}>
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </IconButton>
    </div>
  );
}

export function NoHotels() {
  return (
    <Card as="section" padding="lg">
      <p className="text-sm font-semibold text-blue">Messages</p>
      <h2 className="mt-3 font-serif text-[32px] leading-10 text-ink">Add a listing to message guests.</h2>
      <p className="mt-3 max-w-md leading-7 text-slate">
        Messages go out from one of your properties to the guests who have booked it. List a property first, then you can send them updates.
      </p>
      <Button href={PAGE_ROUTES.LISTINGS_NEW} className="mt-8">
        Add property
      </Button>
    </Card>
  );
}
