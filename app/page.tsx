import Image from "next/image";
import Link from "next/link";
import { DatesField } from "./_components/DatesField";
import { DestinationInput } from "./_components/DestinationInput";
import { GuestsPicker } from "./_components/GuestsPicker";
import { PopularDestinations } from "./_components/PopularDestinations";
import { SearchDrift } from "./_components/SearchDrift";
import { SkyBackground } from "./_components/SkyBackground";
import { Button, SectionHeading, Stars, Tag } from "./_components/ui";
import { WindowScene } from "./_components/WindowScene";
import { STAYS } from "./_data/stays";
import { PAGE_ROUTES } from "@/constants/routes";
import coastalRoom from "./_assets/coastal-room.webp";

const features = [
  {
    title: "Stay more, save more",
    body: "Members get instant discounts and rewards.",
    link: "See member perks",
    href: PAGE_ROUTES.LOGIN,
    icon: <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4l-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z" strokeLinejoin="round" />,
  },
  {
    title: "Homes, not just rooms",
    body: "Kitchens, living rooms and space to unpack.",
    link: "Browse stays",
    href: "#stays",
    icon: <path d="M4 11l8-6 8 6v9H4v-9z M10 20v-5h4v5" strokeLinejoin="round" />,
  },
  {
    title: "Plans change. We get it.",
    body: "Free cancellation on most stays.",
    link: "Find a flexible stay",
    href: "#stays",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

function Icon({ children, className = "h-5 w-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {children}
    </svg>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </Icon>
  );
}

const perks = ["Member prices on every stay", "Rewards on every night you book", "Free cancellation on most stays"];

// Each search segment shows a focus ring while its control (marked data-trigger) has keyboard focus.
// The destination field marks a mouse or touch focus with data-pointer-focus, since text fields
// count as focus-visible even when clicked.
const field =
  // (rounded only while the ring shows, so the divider lines between segments stay straight)
  "flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 md:py-5 has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:rounded-xl has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-2 has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-inset has-[[data-trigger]:focus-visible:not([data-pointer-focus])]:ring-blue";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero: z-10 so the search bar's dropdowns open over the sections below */}
      <section className="relative isolate z-10 px-4 pb-24 pt-14 sm:px-6 sm:pb-32 sm:pt-20">
        {/* The sky fades out toward the bottom, into the page background (either theme) */}
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
          <SkyBackground />
        </div>
        <div className="mx-auto max-w-5xl">
          <h1 className="text-center font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px] lg:text-[72px] lg:leading-[80px]">
            Feel at home, anywhere.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-xl leading-7 text-ink">
            A new favorite stay starts with a hello.
          </p>

          <SearchDrift className="mt-10">
            {/* The fields' bar and the Search button sit side by side, same height. */}
            <form action="/search" className="flex flex-col gap-3 md:flex-row">
              <div className="flex min-w-0 flex-1 flex-col divide-y divide-edge/60 rounded-2xl border border-(--bar-edge) bg-surface/80 p-2 shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop-blur-md md:flex-row md:divide-x md:divide-y-0 md:py-0">
                <DestinationInput className={`${field} md:flex-[1.6]`} />
                <DatesField className={field} />
                <GuestsPicker className={field} />
              </div>
              <button
                type="submit"
                aria-label="Search"
                title="Search"
                className="flex h-14 shrink-0 items-center justify-center rounded-2xl bg-blue text-on-blue shadow-[0_18px_40px_-22px_rgba(68,115,181,0.9)] transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue md:h-auto md:w-[66px]"
              >
                {/* Icon only: a square the height of the bar on desktop */}
                <Icon className="h-6 w-6">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4.5 4.5" strokeLinecap="round" />
                </Icon>
              </button>
            </form>
          </SearchDrift>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6">
        {/* Promo and feature cards sit close together, as one block */}
        <div className="flex flex-col gap-4">
          {/* Promo: the "Come on in." card sets the row height; the illustration
              sits beside it in its own card, portrait-sized to that height */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="flex flex-col justify-center rounded-lg border border-edge bg-surface p-8 sm:p-12">
              <p className="text-sm font-semibold text-blue">LikeHome Members</p>
              <h2 className="mt-3 font-serif text-[40px] leading-[48px] text-ink sm:text-[48px] sm:leading-[56px]">Come on in.</h2>
              <p className="mt-3 max-w-md text-base leading-7 text-slate">
                Members save on thousands of handpicked homes. It’s free, and it takes about a minute.
              </p>
              <ul className="mt-6 space-y-3">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-base text-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                      <Icon className="h-3.5 w-3.5">
                        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
                      </Icon>
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button href={PAGE_ROUTES.LOGIN}>Create account</Button>
                <p className="text-base text-slate">
                  Already a member?{" "}
                  <Link href={PAGE_ROUTES.LOGIN} className="font-semibold text-blue hover:text-blue-dark">
                    Sign in
                  </Link>
                </p>
              </div>
            </section>
            {/* The design reference's illustration: a coastal room with an arched window,
                from the original full-resolution file. Whole on phones; beside the card
                it fills the row height (near its own proportions on desktop). */}
            <div className="relative aspect-[1122/1402] overflow-hidden rounded-lg border border-edge md:aspect-auto">
              <Image
                src={coastalRoom}
                alt="Illustration: a sunny room with an armchair beside an arched window looking out over the sea"
                fill
                sizes="(min-width: 1024px) 360px, (min-width: 768px) 300px, 100vw"
                placeholder="blur"
                unoptimized
                className="object-cover"
              />
              {/* Dim it a little in dark mode so it doesn't glare */}
              <div className="absolute inset-0 bg-[#070D2F]/25 opacity-0 dark:opacity-100" />
            </div>
          </div>
  
          {/* Feature cards: the whole card is the link. A soft blue tint sets them
              apart from the white cards around them; the link text uses blue-dark
              because plain blue drops under 4.5:1 contrast on the tint, and the
              hover tint stops at 14% so blue-dark keeps 4.5:1 on it too. */}
          <section className="grid gap-4 md:grid-cols-3">
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group flex flex-col rounded-lg border border-blue/20 bg-blue/10 p-6 transition-colors duration-200 hover:bg-blue/14 focus-visible:border-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue sm:p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-blue text-on-blue transition-colors duration-200 group-hover:bg-blue-dark">
                  <Icon className="h-6 w-6">{f.icon}</Icon>
                </span>
                <h3 className="mt-5 text-xl font-semibold leading-7 text-ink">{f.title}</h3>
                <p className="mt-2 flex-1 text-base leading-6 text-slate">{f.body}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-base font-semibold text-blue-dark">
                  {f.link}
                  <Arrow className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </section>
        </div>

        <PopularDestinations />

        {/* Featured stays: picture, name and rating, amenity tags, then type and price.
            One row of four from lg up. The row breaks out of the page column to use
            more of a wide screen (up to 1400px, keeping 3rem clear at each edge);
            max(100%, …) keeps it from ever getting narrower than the column. */}
        <section id="stays" className="scroll-mt-6">
          <SectionHeading title="Stays that feel like yours" subtitle="Handpicked places our guests keep coming back to." />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:mx-[calc((100%_-_max(100%,_min(100vw_-_6rem,_1400px)))_/_2)] lg:grid-cols-4">
            {STAYS.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/reserve/${s.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-edge bg-surface focus-visible:border-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue"
                >
                  <div className="aspect-[4/3] overflow-hidden border-b border-edge">
                    <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                      <WindowScene variant={s.variant} id={`scene-${s.slug}`} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-xl leading-7 text-ink">{s.name}</h3>
                      <Stars rating={s.rating} />
                    </div>
                    <p className="text-sm text-slate">{s.location}</p>
                    <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                      {s.tags.map((t) => (
                        <li key={t}>
                          <Tag>{t}</Tag>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center justify-between border-t border-edge pt-3 text-sm">
                      <span className="text-slate">{s.type}</span>
                      <span className="text-ink">
                        <span className="font-semibold">From ${s.rooms[0].nightly}</span>
                        <span className="text-slate"> / night</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
