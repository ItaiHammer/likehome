"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Pagination } from "@/app/_components/Pagination";
import { Toast, useToast } from "@/app/_components/Toast";
import { filterChipClass } from "@/app/_components/ui";
import { useCurrentMinute } from "@/app/_components/useCurrentMinute";
import { PAGE_ROUTES } from "@/constants/routes";
import { emptyText, hubHref, hubQuery, KIND_LABEL, relativeTime, type HubView, type InboxMessage, type KindFilter } from "@/lib/messages";
import { MessageMenu, useDeleteMessage } from "./DeleteMessage";

export type HubRow = { message: InboxMessage; stayLine: string };

const KINDS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "direct", label: "Direct" },
  { value: "promotional", label: "Promotional" },
];

const DELETED = { title: "Message Deleted" };

export function MessageHub({ rows, view, pages, deleted }: { rows: HubRow[]; view: HubView; pages: number; deleted: boolean }) {
  const router = useRouter();
  const now = useCurrentMinute();
  const list = useRef<HTMLUListElement>(null);
  const [gone, setGone] = useState<string[]>([]);
  // A delete from the message's own page comes back here with ?deleted=1
  const { toast, show, dismiss } = useToast(5000, deleted ? DELETED : null);
  const { ask, pending, dialog } = useDeleteMessage(({ id, error }) => {
    if (error) return show({ title: "Couldn’t delete message", body: error, tone: "error" });
    setGone((prev) => [...prev, id]);
    show(DELETED);
    list.current?.focus();
    router.refresh();
  });

  useEffect(() => {
    if (!deleted) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("deleted");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [deleted]);

  const shown = rows.filter((row) => !gone.includes(row.message.id) && !pending.includes(row.message.id));
  const query = hubQuery(view);

  return (
    <>
      <section aria-label="Your messages" className="mx-auto max-w-[900px] rounded-[10px] border-2 border-edge bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-5 sm:px-14">
          <nav aria-label="Message type" className="flex flex-wrap gap-2 sm:gap-[25px]">
            {KINDS.map(({ value, label }) => (
              <Link
                key={value}
                href={hubHref({ ...view, kind: value, page: 1 })}
                aria-current={view.kind === value ? "page" : undefined}
                className={filterChipClass(view.kind === value)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link href={hubHref({ ...view, unread: !view.unread, page: 1 })} className={filterChipClass(view.unread)}>
            Unread only
            <span className="sr-only">{view.unread ? ", on" : ", off"}</span>
          </Link>
        </div>

        {shown.length > 0 ? (
          <ul ref={list} tabIndex={-1} aria-label="Messages" className="px-2 py-4 outline-none sm:px-3 sm:pb-4 sm:pt-2">
            {shown.map(({ message, stayLine }) => {
              const unread = !message.readAt;
              return (
                <li key={message.id} className="relative">
                  <Link
                    href={`${PAGE_ROUTES.MESSAGES}/${encodeURIComponent(message.id)}${query}`}
                    className="grid grid-cols-[14px_minmax(0,1fr)_44px] gap-x-2.5 rounded-control px-2 py-3 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue sm:px-6 dark:hover:bg-white/10"
                  >
                    <span aria-hidden className={`mt-[3px] h-[14px] w-[14px] rounded-full ${unread ? "bg-blue" : ""}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-base leading-5 text-ink">
                        {unread && <span className="sr-only">Unread: </span>}
                        <span className="font-medium">{message.hotelName}</span> | <span className="font-bold text-blue">{KIND_LABEL[message.kind]}</span>
                      </span>
                      <span className="block truncate text-base leading-5 text-ink">{message.subject}</span>
                      {message.body && <span className="block truncate text-base leading-[25px] text-slate">{message.body}</span>}
                      {stayLine && <span className="block text-sm leading-[25px] text-slate">{stayLine}</span>}
                    </span>
                    <span className="flex flex-col items-center">
                      <span className="h-11" />
                      <time dateTime={message.createdAt} className="text-sm font-medium text-ink">
                        {now ? relativeTime(message.createdAt, new Date(now)) : ""}
                      </time>
                    </span>
                  </Link>
                  {/* A sibling of the row's link, so the menu button isn't inside it */}
                  <div className="absolute right-2 top-1.5 sm:right-6">
                    <MessageMenu label={`Options for ${message.hotelName}: ${message.subject}`} onDelete={() => ask(message.id)} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-base text-slate">{emptyText(view)}</p>
        )}
      </section>

      <Pagination size="sm" current={view.page} pages={pages} href={(page) => hubHref({ ...view, page })} label="Message pages" />
      {dialog}
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
