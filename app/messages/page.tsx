import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { filterMessages, hubHref, hubView, HUB_PAGE_SIZE, messageStay, preview, stayLine } from "@/lib/messages";
import { pageSlice } from "@/lib/pagination";
import { guestToday } from "@/utils/guest-today";
import { getInbox, getInboxStays } from "@/utils/inbox";
import { AccountUnread, MessagesFrame, requireTraveler } from "./_components/MessagesFrame";
import { MessageHub } from "./_components/MessageHub";

export const metadata: Metadata = { title: "Messages — LikeHome" };

// Read per request with the sign-in cookie
export const dynamic = "force-dynamic";

export default async function MessagesPage(props: PageProps<"/messages">) {
  const searchParams = await props.searchParams;
  // Old links opened a message with ?m=
  if (typeof searchParams.m === "string" && searchParams.m) redirect(`${PAGE_ROUTES.MESSAGES}/${encodeURIComponent(searchParams.m)}`);

  const view = hubView(searchParams);
  const back = hubHref(view);
  const traveler = await requireTraveler(back);

  const frame = (children: React.ReactNode) => (
    <MessagesFrame eyebrow="Stay connected" title="Your messages" subtitle="Conversations, announcements, and updates in one place.">
      {children}
    </MessagesFrame>
  );
  if (!traveler) return frame(<AccountUnread back={back} />);

  const { messages, error } = await getInbox();
  if (error) throw new Error(error);

  const shown = pageSlice(filterMessages(messages, view), view.page, HUB_PAGE_SIZE);
  const [stays, today] = shown.items.length > 0 ? await Promise.all([getInboxStays(), guestToday()]) : [[], ""];
  const rows = shown.items.map((message) => ({
    message: { ...message, body: preview(message.body) },
    stayLine: stayLine(messageStay(message, stays, today)),
  }));

  return frame(<MessageHub rows={rows} view={{ ...view, page: shown.page }} pages={shown.pages} />);
}
