import Link from "next/link";
import { ArrowIcon, arrowSlideClass, Card, SectionHeading, sectionLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { ownerStats, statsSubtitle } from "@/lib/home-owner";
import { loadOwnerHistory } from "./owner-history";
import { cardLabel } from "./styles";

const TITLE_ID = "owner-stats-title";

// Totals from the owner's customer and booking history. Hidden with no listings, or when the read failed.
export async function OwnerStats() {
  const history = await loadOwnerHistory();
  if (!history || history.listings.length === 0) return null;
  const stats = ownerStats(history.summary, history.bookings);

  return (
    <section aria-labelledby={TITLE_ID}>
      <SectionHeading
        id={TITLE_ID}
        title="How your places are doing"
        subtitle={statsSubtitle(history.listings.length)}
        action={
          <Link href={PAGE_ROUTES.OWNER_CUSTOMERS} className={sectionLinkClass}>
            See customers and bookings
            <ArrowIcon className={arrowSlideClass} />
          </Link>
        }
      />
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} as="li" padding="none" className="p-5 sm:px-[22px]">
            <h3 className={cardLabel}>{s.label}</h3>
            <p className="mt-2 font-bold text-[32px] leading-9 text-ink [overflow-wrap:anywhere] sm:mt-1.5 sm:text-[40px] sm:leading-[44px]">{s.value}</p>
            <p className="mt-2 text-[15px] leading-6 text-slate sm:mt-1">{s.detail}</p>
          </Card>
        ))}
      </ul>
    </section>
  );
}
