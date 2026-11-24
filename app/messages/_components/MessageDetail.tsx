"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, arrowSlideClass, sectionLinkClass } from "@/app/_components/ui";
import type { InboxMessage } from "@/lib/messages";
import { sendRead } from "./messageApi";

export function MessageDetail({
  message,
  regarding,
  link,
}: {
  message: InboxMessage;
  regarding: string;
  link: { href: string; label: string } | null;
}) {
  const router = useRouter();
  const sent = useRef(false);
  const [readFailed, setReadFailed] = useState(false);

  // Opening a message marks it read; the refresh updates the header's unread mark
  useEffect(() => {
    if (message.readAt || sent.current) return;
    sent.current = true;
    void sendRead(message.id).then((outcome) => {
      if (outcome === "failed") setReadFailed(true);
      else router.refresh();
    });
  }, [message.id, message.readAt, router]);

  return (
    <article aria-label="Message" className="mx-auto max-w-[900px] rounded-[10px] border-2 border-edge bg-surface px-5 pb-10 pt-8 sm:px-[47px] sm:pb-[45px] sm:pt-[45px]">
      {readFailed && (
        <p role="status" className="mb-4 text-sm text-danger">
          We couldn’t mark this message as read. It stays unread until you open it again.
        </p>
      )}
      {/* Plain text: a hotel's message is never rendered as HTML */}
      <div className="whitespace-pre-line break-words text-base leading-5 text-ink">{message.body}</div>
      {(regarding || link) && (
        <div className="mt-8 border-t border-edge pt-8">
          {regarding && <p className="text-base leading-5 text-ink">{regarding}</p>}
          {link && (
            <Link href={link.href} className={`${sectionLinkClass} ${regarding ? "mt-[15px]" : ""}`}>
              {link.label}
              <ArrowIcon className={arrowSlideClass} />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
