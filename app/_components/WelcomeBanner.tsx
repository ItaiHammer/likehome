import Image from "next/image";
import Link from "next/link";
import coastalRoom from "@/app/_assets/coastal-room.webp";
import type { HomeAction } from "@/lib/account/home";

const ICONS: Record<HomeAction["icon"], React.ReactNode> = {
  bookings: <path d="M4 8h16v11H4z M9 8V5h6v3 M4 13h16" strokeLinejoin="round" />,
  search: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z" strokeLinejoin="round" />,
  listings: <path d="M4 11l8-6 8 6v9H4v-9z M10 20v-5h4v5" strokeLinejoin="round" />,
  add: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
};

// Signed-in homepage card: picture, title and the account's two main links.
// The design's doorway picture isn't in the repo yet, so this uses the coastal room.
export function WelcomeBanner({ title, body, actions }: { title: string; body: string; actions: HomeAction[] }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-edge bg-surface md:flex-row">
      <div className="relative aspect-[5/2] w-full shrink-0 md:aspect-auto md:min-h-36 md:w-60">
        <Image src={coastalRoom} alt="" fill sizes="(min-width: 768px) 240px, 100vw" placeholder="blur" unoptimized className="object-cover" />
        <div className="absolute inset-0 bg-[#070D2F]/40 opacity-0 dark:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col gap-5 p-6 md:flex-row md:items-center md:gap-8 md:py-4 md:pl-8 md:pr-4">
        <div className="flex-1 md:border-l md:border-edge md:pl-8">
          <h2 className="font-serif text-[32px] leading-10 text-ink">{title}</h2>
          <p className="mt-1 text-base leading-6 text-slate">{body}</p>
        </div>
        {/* The feature cards' blue tint and sliding arrow, so the two links read as part of the page */}
        <nav
          aria-label={title}
          className="shrink-0 divide-y divide-blue/15 overflow-hidden rounded-md border border-blue/20 bg-[color-mix(in_srgb,var(--blue)_8%,var(--surface))] dark:bg-blue/10 md:w-[320px]"
        >
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--blue)_14%,var(--surface))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue dark:hover:bg-blue/14"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${
                  a.variant === "primary"
                    ? "bg-blue text-on-blue group-hover:bg-blue-dark"
                    : "border border-blue/30 bg-surface text-blue-dark group-hover:border-blue"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  {ICONS[a.icon]}
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold leading-6 text-ink">{a.label}</span>
                <span className="block text-sm leading-5 text-slate">{a.hint}</span>
              </span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-blue-dark transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
