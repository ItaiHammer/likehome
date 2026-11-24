import Link from "next/link";
import { ShinyLabel } from "@/app/_components/ShinyLabel";
import { ArrowIcon, arrowSlideClass, Icon, tintLink } from "@/app/_components/ui";
import type { HomeShortcut } from "@/lib/account/home";

const ICONS: Record<NonNullable<HomeShortcut["icon"]>, React.ReactNode> = {
  messages: <path d="M4 6h16v11H9l-5 4z" strokeLinecap="round" strokeLinejoin="round" />,
  add: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
};

// A tinted link with an icon, its label and what it's for. 72px tall on phones.
export function ShortcutTile({ label, hint, href, icon }: Pick<HomeShortcut, "label" | "hint" | "href" | "icon">) {
  return (
    <Link href={href} className={`${tintLink} flex min-h-[72px] items-center gap-4 px-5 py-3 sm:min-h-0 sm:gap-3.5 sm:px-4 sm:py-3.5`}>
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue text-on-blue transition-colors duration-200 group-hover:bg-blue-dark">
          <Icon>{ICONS[icon]}</Icon>
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-6 text-ink sm:text-[15px]">{label}</span>
        <span className="block text-[15px] leading-6 text-slate sm:text-sm sm:leading-5">{hint}</span>
      </span>
      <ArrowIcon className={`shrink-0 text-blue-dark ${arrowSlideClass}`} />
    </Link>
  );
}

// The shiny "LikeHome Members" line over a top block's title
export function MembersLabel() {
  return (
    <p className="text-sm font-semibold">
      <ShinyLabel text="LikeHome Members" />
    </p>
  );
}

/**
 * A linked card's "go there" line, with an arrow that slides while the card is hovered.
 * `className` sets its spacing and size; the default pins it to the foot of a summary card from sm up.
 */
export function CardAction({ children, className = "mt-4 text-[15px] leading-6 sm:mt-auto sm:pt-3.5" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-blue-dark ${className}`}>
      {children}
      <ArrowIcon className={arrowSlideClass} />
    </span>
  );
}
