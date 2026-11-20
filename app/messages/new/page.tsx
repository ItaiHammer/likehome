import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageBackdrop } from "@/app/_components/PageBackdrop";
import { PAGE_ROUTES } from "@/constants/routes";
import { getHotelsByOwner } from "@/utils/hotels";
import { getViewer } from "@/utils/viewer";
import { Composer } from "./Composer";

export const metadata: Metadata = { title: "New message — LikeHome" };

// Read per request with the sign-in cookie
export const dynamic = "force-dynamic";

export default async function NewMessagePage(props: PageProps<"/messages/new">) {
  const { hotel } = await props.searchParams;
  const wanted = typeof hotel === "string" && hotel ? hotel : null;

  const viewer = await getViewer();
  if (viewer.role === "signed-out" || !viewer.userId) {
    const here = wanted ? `${PAGE_ROUTES.MESSAGES_NEW}?hotel=${encodeURIComponent(wanted)}` : PAGE_ROUTES.MESSAGES_NEW;
    redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(here)}`);
  }
  if (viewer.role !== "business") redirect(PAGE_ROUTES.MESSAGES);

  const { data, error } = await getHotelsByOwner(viewer.userId);
  if (error) throw new Error(error.message);
  const hotels = ((data ?? []) as { id: string; name: string | null }[])
    .map((h) => ({ id: h.id, name: h.name?.trim() || "Untitled property" }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const initialHotelId = hotels.find((h) => h.id === wanted)?.id ?? hotels[0]?.id ?? null;
  const backHref = initialHotelId ? `${PAGE_ROUTES.MESSAGES}?hotel=${encodeURIComponent(initialHotelId)}` : PAGE_ROUTES.MESSAGES;

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Ink, not blue, even on hover: blue text on the sky strip is too faint to read */}
        <Link
          href={backHref}
          className="group inline-flex items-center gap-1 rounded-control text-base font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>{" "}
          Back to messages
        </Link>
        <h1 className="mt-4 font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">New message</h1>
        <p className="mt-2 text-lg leading-7 text-ink">Send an update to guests who have booked with you.</p>

        <div className="mt-8">
          <Composer hotels={hotels} initialHotelId={initialHotelId} />
        </div>
      </main>
    </div>
  );
}
