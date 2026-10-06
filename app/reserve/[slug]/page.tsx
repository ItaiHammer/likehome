import { notFound } from "next/navigation";
import { getStay, STAYS } from "../../_data/stays";
import { StayReservation } from "./StayReservation";

export function generateStaticParams() {
  return STAYS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const stay = getStay(slug);
  return { title: stay ? `Reserve ${stay.name} — LikeHome` : "Stay not found — LikeHome" };
}

export default async function ReservePage(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const stay = getStay(slug);
  if (!stay) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <StayReservation stay={stay} />
    </main>
  );
}
