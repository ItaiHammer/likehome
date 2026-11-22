import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { hubHref, hubQuery, hubView, messageLink, messageStay, regardingLine } from "@/lib/messages";
import { guestToday } from "@/utils/guest-today";
import { getInbox, getInboxStays } from "@/utils/inbox";
import { AccountUnread, MessagesFrame, requireTraveler } from "../_components/MessagesFrame";
import { MessageDetail } from "../_components/MessageDetail";

export const metadata: Metadata = { title: "Message — LikeHome" };

export const dynamic = "force-dynamic";

export default async function MessagePage(props: PageProps<"/messages/[id]">) {
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  // The hub's filters and page ride along, so going back lands where the traveler was
  const view = hubView(searchParams);
  const self = `${PAGE_ROUTES.MESSAGES}/${encodeURIComponent(id)}${hubQuery(view)}`;
  const traveler = await requireTraveler(self);

  const backLink = (
    <Link
      href={hubHref(view)}
      className="group inline-flex items-center gap-1 rounded-control text-sm font-semibold text-blue-dark hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue max-sm:min-h-11"
    >
      <ArrowIcon className="h-4 w-4 -scale-x-100 transition-transform duration-200 group-hover:-translate-x-1" />
      Back to messages
    </Link>
  );

  if (!traveler) {
    return (
      <MessagesFrame eyebrow={backLink} title="Message" subtitle="">
        <AccountUnread back={self} />
      </MessagesFrame>
    );
  }

  const { messages, error } = await getInbox();
  if (error) throw new Error(error);
  const message = messages.find((m) => m.id === id);
  if (!message) notFound();

  const needsStay = message.reservationId !== null || message.kind === "direct";
  const [stays, today] = needsStay ? await Promise.all([getInboxStays(), guestToday()]) : [[], ""];
  const stay = messageStay(message, stays, today);

  return (
    <MessagesFrame eyebrow={backLink} title={message.hotelName} subtitle={message.subject}>
      <MessageDetail
        message={message}
        regarding={regardingLine(message.hotelName, stay)}
        link={messageLink(message, stay)}
        afterDelete={hubHref(view, true)}
      />
    </MessagesFrame>
  );
}
