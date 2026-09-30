import Link from "next/link";

type CardTone = "surface" | "tint";
type CardPadding = "none" | "md" | "lg";

const cardTones: Record<CardTone, string> = {
  surface: "border-edge bg-surface",
  tint: "border-blue/20 bg-blue/10",
};
const cardPaddings: Record<CardPadding, string> = { none: "", md: "p-6", lg: "p-8 sm:p-12" };

/**
 * Bordered box that groups related content. `tone="tint"` gives the soft blue
 * version; pass `href` to make the whole card a link.
 *
 *   <Card>…</Card>
 *   <Card tone="tint" href="/signup">…</Card>
 */
export function Card({
  tone = "surface",
  padding = "md",
  href,
  as: Tag = "div",
  className = "",
  children,
}: {
  tone?: CardTone;
  padding?: CardPadding;
  href?: string;
  as?: "div" | "section" | "article" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  const classes = `rounded-lg border ${cardTones[tone]} ${cardPaddings[padding]} ${className}`;
  if (href) {
    const link = (
      <Link
        href={href}
        className={`group block transition-colors ${tone === "tint" ? "hover:bg-blue/15" : "hover:border-blue/50"} focus-visible:border-blue focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue ${classes}`}
      >
        {children}
      </Link>
    );
    // Keep the requested element around the link (e.g. <li> in a list)
    return Tag === "div" ? link : <Tag>{link}</Tag>;
  }
  return <Tag className={classes}>{children}</Tag>;
}

/**
 * Small label for amenities, categories or status.
 *
 *   <Tag>Sea view</Tag>
 *   <Tag tone="blue">New</Tag>
 */
export function Tag({ tone = "neutral", size = "sm", children }: { tone?: "neutral" | "blue"; size?: "sm" | "md"; children: React.ReactNode }) {
  const tones = { neutral: "border-edge text-slate", blue: "border-transparent bg-blue/10 text-blue-dark" };
  const sizes = { sm: "px-2 py-0.5 text-xs", md: "px-2.5 py-1 text-sm" };
  return <span className={`inline-flex items-center rounded-control border ${tones[tone]} ${sizes[size]}`}>{children}</span>;
}

/**
 * Section title in the serif, with an optional line under it and an optional
 * action (a link or button) on the right.
 *
 *   <SectionHeading title="Stays that feel like yours" subtitle="Handpicked places…" />
 */
export function SectionHeading({
  title,
  subtitle,
  action,
  id,
  as: Heading = "h2",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <Heading id={id} className="font-serif text-[40px] leading-[48px] text-ink">
          {title}
        </Heading>
        {subtitle && <p className="mt-1 text-base text-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Star rating, optionally with the review count.
 *
 *   <Stars rating={4.96} reviews={128} />
 */
export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink">
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue" fill="currentColor" aria-hidden>
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
      </svg>
      <span className="font-semibold">{rating.toFixed(2)}</span>
      {reviews !== undefined && <span className="text-slate">· {reviews} reviews</span>}
    </span>
  );
}
