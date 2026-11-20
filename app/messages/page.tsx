import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageBackdrop } from "@/app/_components/PageBackdrop";
import { buttonClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { choicePathFor } from "@/lib/account/choice";
import { groupSent } from "@/lib/messages";
import { getHotelsByOwner } from "@/utils/hotels";
import { getInbox } from "@/utils/inbox";
import { getMessagesByHotel } from "@/utils/messages";
import { getViewer } from "@/utils/viewer";
import { Inbox } from "./_components/Inbox";
import { SentMessages } from "./_components/SentMessages";

export const metadata: Metadata = { title: "Messages — LikeHome" };

// Read per request with the sign-in cookie
export const dynamic = "force-dynamic";

type HotelRow = { id: string; name: string | null };

const param = (value: string | string[] | undefined) => (typeof value === "string" && value ? value : null);

function positiveInt(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Where sign-in and the account type choice send the viewer back to
function returnPath(m: string | null, hotel: string | null) {
  const search = new URLSearchParams();
  if (m) search.set("m", m);
  if (hotel) search.set("hotel", hotel);
  const query = search.toString();
  return query ? `${PAGE_ROUTES.MESSAGES}?${query}` : PAGE_ROUTES.MESSAGES;
}

async function loadSent(ownerId: string, requestedHotel: string | null) {
  const { data, error } = await getHotelsByOwner(ownerId);
  if (error) throw new Error(error.message);
  const hotels = ((data ?? []) as HotelRow[])
    .map((h) => ({ id: h.id, name: h.name?.trim() || "Untitled property" }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const hotelId = hotels.some((h) => h.id === requestedHotel) ? requestedHotel : (hotels[0]?.id ?? null);
  if (!hotelId) return { hotels, hotelId, sent: [] };

  const sentRows = await getMessagesByHotel(hotelId);
  if (sentRows.error) throw new Error(sentRows.error.message);
  return { hotels, hotelId, sent: groupSent(sentRows.data ?? []) };
}

export default async function MessagesPage(props: PageProps<"/messages">) {
  const searchParams = await props.searchParams;
  const m = param(searchParams.m);
  const hotel = param(searchParams.hotel);
  const back = returnPath(m, hotel);

  const viewer = await getViewer();
  if (viewer.role === "signed-out" || !viewer.userId) redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(back)}`);
  if (viewer.role === "unchosen") redirect(choicePathFor(back));

  if (viewer.role === "business") {
    const { hotels, hotelId, sent } = await loadSent(viewer.userId, hotel);
    return (
      <MessagesFrame subtitle="Send updates to guests who have booked your properties.">
        <SentMessages hotels={hotels} hotelId={hotelId} sent={sent} justSent={positiveInt(param(searchParams.sent))} />
      </MessagesFrame>
    );
  }

  if (viewer.role === "personal") {
    const { messages, error } = await getInbox();
    if (error) throw new Error(error);
    return (
      <MessagesFrame subtitle="Updates from hotels you’ve booked. You can’t reply to them here.">
        <Inbox messages={messages} initialId={m} />
      </MessagesFrame>
    );
  }

  return (
    <MessagesFrame subtitle="Updates from the hotels you book with.">
      <section aria-labelledby="account-unread-heading" className="max-w-2xl rounded-lg border border-edge bg-surface p-8 sm:p-12">
        <h2 id="account-unread-heading" className="font-serif text-[32px] leading-10 text-ink">
          We couldn’t read your account just now.
        </h2>
        <p className="mt-3 leading-7 text-slate">Your messages are safe. This is usually brief, so give it another try in a moment.</p>
        {/* A full page load, so the layout reads the account again too */}
        <a href={back} className={`${buttonClass("primary")} mt-8`}>
          Try again
        </a>
      </section>
    </MessagesFrame>
  );
}

function MessagesFrame({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">Messages</h1>
        {/* Ink, not slate: lighter text on the sky strip is too faint to read */}
        <p className="mt-2 text-lg leading-7 text-ink">{subtitle}</p>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
