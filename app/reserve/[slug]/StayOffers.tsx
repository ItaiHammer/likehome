import type { Offer } from "../../_data/stays";

// What the stay has, straight from its tags (the same names as the search filters). Only what it
// offers is listed, never what it doesn't.
export function StayOffers({ offers, goodFor }: { offers: Offer[]; goodFor: string[] }) {
  if (offers.length === 0 && goodFor.length === 0) {
    return <p className="mt-6 text-sm text-slate">No amenities listed yet.</p>;
  }
  return (
    <section aria-label="What this stay offers" className="mt-6">
      {offers.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {offers.map((o) => (
            <li key={o.label} className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1 text-sm text-ink">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-blue" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {o.label}
              {o.someRooms && <span className="text-slate">· some rooms</span>}
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
