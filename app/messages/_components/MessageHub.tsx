"use client";

import Link from "next/link";
import { Pagination } from "@/app/_components/Pagination";
import { filterChipClass } from "@/app/_components/ui";
import { useCurrentMinute } from "@/app/_components/useCurrentMinute";
import { PAGE_ROUTES } from "@/constants/routes";
import { emptyText, hubHref, hubQuery, relativeTime, type HubView, type InboxMessage } from "@/lib/messages";

type HubRow = { message: InboxMessage; stayLine: string };

export function MessageHub({ rows, view, pages }: { rows: HubRow[]; view: HubView; pages: number }) {
  const now = useCurrentMinute();
  const query = hubQuery(view);

  return (
    <>
      <section aria-label="Your messages" className="mx-auto max-w-[900px] rounded-[10px] border-2 border-edge bg-surface">
        <div className="flex justify-end border-b border-edge px-4 py-5 sm:px-14">
          <Link href={hubHref({ unread: !view.unread, page: 1 })} className={filterChipClass(view.unread)}>
            Unread only
            <span className="sr-only">{view.unread ? ", on" : ", off"}</span>
          </Link>
        </div>

        {rows.length > 0 ? (
          <ul aria-label="Messages" className="px-2 py-4 sm:px-3 sm:pb-4 sm:pt-2">
            {rows.map(({ message, stayLine }) => {
              const unread = !message.readAt;
              return (
                <li key={message.id}>
                  <Link
                    href={`${PAGE_ROUTES.MESSAGES}/${encodeURIComponent(message.id)}${query}`}
                    className="grid grid-cols-[14px_minmax(0,1fr)_auto] gap-x-2.5 rounded-control px-2 py-3 transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue sm:px-6 dark:hover:bg-white/10"
                  >
                    <span aria-hidden className={`mt-[3px] h-[14px] w-[14px] rounded-full ${unread ? "bg-blue" : ""}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium leading-5 text-ink">
                        {unread && <span className="sr-only">Unread: </span>}
                        {message.hotelName}
                      </span>
                      <span className="block truncate text-base leading-5 text-ink">{message.subject}</span>
                      {message.body && <span className="block truncate text-base leading-[25px] text-slate">{message.body}</span>}
                      {stayLine && <span className="block text-sm leading-[25px] text-slate">{stayLine}</span>}
                    </span>
                    <time dateTime={message.createdAt} className="text-sm font-medium leading-5 text-ink">
                      {now ? relativeTime(message.createdAt, new Date(now)) : ""}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-base text-slate">{emptyText(view)}</p>
        )}
      </section>

      <Pagination size="sm" current={view.page} pages={pages} href={(page) => hubHref({ ...view, page })} label="Message pages" />
    </>
  );
}
