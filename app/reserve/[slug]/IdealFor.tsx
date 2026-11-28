import { normalizeTravelerCategories } from "@/lib/ideal-for";

function CategoryIcon({ category }: { category: string }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4 shrink-0 text-blue",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (category.toLowerCase()) {
    case "pets":
      return <svg {...common}><circle cx="5" cy="10" r="1.5"/><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="19" cy="10" r="1.5"/><path d="M8.4 14.6c1.1-1.2 1.9-2.6 3.6-2.6s2.5 1.4 3.6 2.6c1.5 1.8 1.7 4.6-.5 5.2-1.4.4-2.2-.7-3.1-.7s-1.7 1.1-3.1.7c-2.2-.6-2-3.4-.5-5.2Z"/></svg>;
    case "couples":
      return <svg {...common}><path d="M20.7 8c0 4.4-8.7 10.1-8.7 10.1S3.3 12.4 3.3 8a4.5 4.5 0 0 1 8.7-1.6A4.5 4.5 0 0 1 20.7 8Z"/></svg>;
    case "kids":
      return <svg {...common}><circle cx="12" cy="7" r="3"/><path d="M12 10v7m-5 3 5-3 5 3M8 13l4 2 4-2"/></svg>;
    case "friends":
      return <svg {...common}><circle cx="7" cy="8" r="2.5"/><circle cx="17" cy="8" r="2.5"/><path d="M2.5 19v-1.5a4.5 4.5 0 0 1 9 0V19M12.5 19v-1.5a4.5 4.5 0 0 1 9 0V19"/></svg>;
    case "families":
      return <svg {...common}><circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M2 19v-2a5 5 0 0 1 8-4M22 19v-2a5 5 0 0 0-8-4M8 21v-1a4 4 0 0 1 8 0v1"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>;
  }
}

/** Traveler types are metadata, not amenities. All supplied categories are supported. */
export function IdealFor({ categories, className = "" }: { categories: string[]; className?: string }) {
  const unique = normalizeTravelerCategories(categories);
  if (unique.length === 0) return null;

  return (
    <section aria-label="Who this stay is ideal for" className={`rounded-2xl border border-edge bg-surface px-5 py-4 sm:px-7 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
        <h2 className="shrink-0 text-base font-semibold text-ink">Ideal for</h2>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {unique.map((category) => (
            <li key={category} className="inline-flex items-center gap-2 text-sm text-slate">
              <CategoryIcon category={category}/>{category}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
