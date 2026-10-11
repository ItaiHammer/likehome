import { notFound } from "next/navigation";
import { cache } from "react";
import { PageBackdrop } from "../../_components/PageBackdrop";
import { getStay, STAYS } from "../../_data/stays";
import { getHotelStay } from "./hotelStay";
import { StayReservation } from "./StayReservation";

// The sample stays are built ahead of time; database hotels (by id) render when visited
export function generateStaticParams() {
  return STAYS.map((s) => ({ slug: s.slug }));
}

// Cached per request, so the title and the page share one database lookup
const findStay = cache(async (slug: string) => getStay(slug) ?? (await getHotelStay(slug)));

export async function generateMetadata(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const stay = await findStay(slug);
  return { title: stay ? `Reserve ${stay.name} — LikeHome` : "Stay not found — LikeHome" };
}

export default async function ReservePage(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const stay = await findStay(slug);
  if (!stay) notFound();

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <StayReservation stay={stay} />
      </main>
    </div>
  );
}
