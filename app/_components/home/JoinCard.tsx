import Image from "next/image";
import Link from "next/link";
import coastalRoom from "@/app/_assets/coastal-room.webp";
import { authLinkClass, Button, Icon, tintBox, tintLink } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { CardAction, MembersLabel } from "./ShortcutTile";

const TITLE_ID = "join-title";

const perks = ["Member prices on every stay", "Rewards on every night you book", "Change your dates or room online"];

// Both go to sign-in: the account type is chosen after it
const pitches = [
  { title: "Traveling?", body: "Find a stay and book in minutes.", action: "Join to save", variant: "primary" },
  { title: "Have a place?", body: "List it, manage rooms and photos, and message your guests.", action: "List your place", variant: "secondary" },
] as const;

const features = [
  {
    title: "Stay more, save more",
    body: "Members get instant discounts and rewards.",
    link: "See member perks",
    href: PAGE_ROUTES.LOGIN,
    icon: <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4l-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z" strokeLinejoin="round" />,
  },
  {
    title: "Homes that bend with your plans",
    body: "Kitchens and space to unpack, and you can change your dates, room or guests in My Bookings up to the day before check-in.",
    link: "Browse stays",
    href: PAGE_ROUTES.SEARCH,
    icon: <path d="M4 11l8-6 8 6v9H4v-9z M10 20v-5h4v5" strokeLinejoin="round" />,
  },
];

// Signed out: the sign-up card with its two pitches, the coastal room beside it (under it on phones),
// and the two feature cards (from sm up). The card switches to two columns by its own width, as the
// picture beside it leaves it less room than the window suggests.
export function JoinCard() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby={TITLE_ID} className="@container rounded-lg border border-edge bg-surface p-6 sm:p-8 lg:p-10">
          {/* One column: title, pitches, perks, sign-in. Two columns: the pitches move to the right */}
          <div className="grid gap-6 @[42rem]:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)] @[42rem]:grid-rows-[auto_auto_1fr] @[42rem]:gap-x-9 @[42rem]:gap-y-0">
            <div className="@[42rem]:col-start-1">
              <MembersLabel />
              <h2 id={TITLE_ID} className="mt-1.5 font-serif text-[32px] leading-10 text-ink sm:mt-2.5 sm:text-[48px] sm:leading-[56px]">
                Come on in.
              </h2>
              <p className="mt-1.5 text-base leading-6 text-slate sm:mt-2.5">One free account, two ways to use it.</p>
            </div>

            {/* Phones: ruled off (the tint box cut down to its bottom rule), with full-width buttons. From sm
                up: tinted boxes whose buttons share one subgrid column, so both are as wide as the wider one */}
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3 @[42rem]:col-start-2 @[42rem]:row-span-3 @[42rem]:row-start-1 @[42rem]:auto-rows-fr">
              {pitches.map((p) => (
                <div
                  key={p.title}
                  className={`${tintBox} grid gap-5 max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:border-edge/60 max-sm:bg-transparent max-sm:pb-6 max-sm:dark:bg-transparent sm:col-span-2 sm:grid-cols-subgrid sm:items-center sm:gap-4 sm:px-5 sm:py-[18px]`}
                >
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold leading-6 text-ink">{p.title}</h3>
                    <p className="mt-1 text-[15px] leading-6 text-slate sm:text-sm sm:leading-[21px]">{p.body}</p>
                  </div>
                  <Button href={PAGE_ROUTES.LOGIN} variant={p.variant} className="w-full whitespace-nowrap">
                    {p.action}
                  </Button>
                </div>
              ))}
            </div>

            <ul className="space-y-3.5 sm:space-y-3 @[42rem]:col-start-1 @[42rem]:mt-6">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-[15px] leading-6 text-ink">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
                    <Icon className="h-3.5 w-3.5">
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
                    </Icon>
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            {/* On phones the link is 44px tall; the negative margin keeps the line where 24px would put it */}
            <p className="-my-2.5 flex flex-wrap items-center gap-x-1 text-base leading-6 text-slate sm:my-0 @[42rem]:col-start-1 @[42rem]:self-end @[42rem]:pt-6">
              Already a member?
              <Link href={PAGE_ROUTES.LOGIN} className={`${authLinkClass} inline-flex min-h-11 items-center sm:min-h-0`}>
                Sign in
              </Link>
            </p>
          </div>
        </section>

        {/* The design reference's illustration: a coastal room with an arched window, from the original
            full-resolution file. A strip under the card on phones; beside it, it fills the row height. */}
        <div className="relative aspect-[7/4] overflow-hidden rounded-lg border border-edge md:aspect-auto">
          <Image
            src={coastalRoom}
            alt="Illustration: a sunny room with an armchair beside an arched window looking out over the sea"
            fill
            sizes="(min-width: 768px) 300px, 100vw"
            placeholder="blur"
            unoptimized
            className="object-cover"
          />
          {/* Dim it a little in dark mode so it doesn't glare */}
          <div className="absolute inset-0 bg-[#070D2F]/40 opacity-0 dark:opacity-100" />
        </div>
      </div>

      {/* Feature cards: the whole card is the link. The link text uses blue-dark because plain blue drops
          under 4.5:1 contrast on the tint. Left out on phones, where the page is long enough. */}
      <div className="hidden gap-4 sm:grid md:grid-cols-2">
        {features.map((f) => (
          <Link key={f.title} href={f.href} className={`${tintLink} flex flex-col p-6 sm:p-7`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-blue text-on-blue transition-colors duration-200 group-hover:bg-blue-dark">
              <Icon className="h-6 w-6">{f.icon}</Icon>
            </span>
            <h3 className="mt-5 text-xl font-semibold leading-7 text-ink">{f.title}</h3>
            <p className="mt-2 flex-1 text-base leading-6 text-slate">{f.body}</p>
            <CardAction className="mt-6 text-base">{f.link}</CardAction>
          </Link>
        ))}
      </div>
    </div>
  );
}
