import type { Offer } from "../../_data/stays";
import { displayAmenityLabel } from "@/app/search/types";

// What the stay has, straight from its tags (the same names as the search filters). Only what it
// offers is listed, never what it doesn't.
export function StayOffers({ offers, goodFor }: { offers: Offer[]; goodFor: string[] }) {
  if (offers.length === 0 && goodFor.length === 0) {
    return <p className="mt-6 text-sm text-slate">No amenities listed yet.</p>;
  }
  return (
    <section aria-label="What this stay offers" className="mt-6">
      {offers.length > 0 && (
        <ul className="grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <li key={o.label} className="flex items-start gap-2 text-sm leading-6 text-ink">
              <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-blue" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span>{displayAmenityLabel(o.label)}{o.someRooms && <span className="text-slate"> · some rooms</span>}</span>
            </li>
          ))}
        </ul>
      )}
      {goodFor.length > 0 && (
        <p className="mt-3 text-sm text-slate">
          Good for <span className="text-ink">{goodFor.join(" · ")}</span>
        </p>
      )}
    </section>
  );
}
