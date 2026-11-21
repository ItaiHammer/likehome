// Class strings behind the shared components, from the LikeHome component sheet:
// 46px-tall inputs and buttons, 6.4px corners (rounded-control), 16px text inset.
// Prefer the components (<Button>, <Field>, ...); these stay exported for places
// that need the look on another element.
//
// Focus: `outline-hidden` (not `outline-none`) wherever a ring shows focus, so
// Windows high-contrast mode still draws a focus outline.

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ControlSize = "md" | "sm";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const buttonSizes: Record<ControlSize, string> = {
  md: "h-[46px] px-6 text-base",
  sm: "h-9 px-4 text-sm",
};

const buttonVariants: Record<ButtonVariant, string> = {
  // text-on-blue: white in light mode, dark navy in dark mode (white on the lighter dark-mode blue is only 3:1)
  primary: "bg-blue text-on-blue hover:bg-blue-dark disabled:bg-disabled disabled:text-slate",
  secondary:
    "border border-edge bg-surface text-ink hover:border-blue disabled:border-disabled disabled:bg-disabled disabled:text-slate",
  // blue-dark text: plain blue is just under 4.5:1 on white and paper; the tint alone shows hover
  ghost: "text-blue-dark hover:bg-blue/10 disabled:text-slate disabled:hover:bg-transparent",
};

export const buttonClass = (variant: ButtonVariant = "primary", size: ControlSize = "md") =>
  `${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]}`;

export const buttonPrimary = buttonClass("primary");
export const buttonSecondary = buttonClass("secondary");

const iconSizes: Record<ControlSize, string> = { md: "h-[46px] w-[46px]", sm: "h-9 w-9" };

// aria-disabled: looks inactive but keeps focus (use it instead of `disabled` on
// buttons that can hit a limit while focused, like steppers and carousel arrows)
export const iconButtonClass = (size: ControlSize = "md") =>
  `inline-flex ${iconSizes[size]} shrink-0 items-center justify-center rounded-control border border-edge bg-surface text-ink transition-colors hover:border-blue focus-visible:border-blue focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue disabled:cursor-not-allowed disabled:border-disabled disabled:bg-disabled disabled:text-slate aria-disabled:cursor-not-allowed aria-disabled:border-disabled aria-disabled:bg-disabled aria-disabled:text-slate aria-disabled:hover:border-disabled`;

// Square 46px outline button for icon-only controls (steppers, arrows, close)
export const iconButton = iconButtonClass("md");

export const inputClass = (error?: boolean) =>
  `h-[46px] w-full rounded-control border bg-surface px-4 font-sans text-base text-ink placeholder:text-slate transition focus:outline-hidden focus:ring-1 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate ${
    error ? "border-danger focus:border-danger focus:ring-danger" : "border-edge focus:border-blue focus:ring-blue"
  }`;

// The header's Sign in / Sign out text links
export const authLinkClass =
  "rounded-control py-2 text-base font-semibold text-blue hover:text-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

// Tighter on phones so "Sign out" stays on one line beside the Menu button at 360px
export const headerAuthLinkClass = `${authLinkClass} whitespace-nowrap px-2 sm:px-3`;

/** Hotel cards: the card lifts a little on hover, and its photo (inside an element with `group`) zooms in slightly */
export const cardLiftClass = "transition-transform duration-200 hover:-translate-y-0.5";
export const photoZoomClass = "transition-transform duration-500 group-hover:scale-[1.025]";

/** The header's plain 36px icon buttons (theme, messages bell); after: gives each a 44px tap area */
export const headerIconButtonClass =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink transition-colors after:absolute after:-inset-1 hover:bg-ink/5 hover:text-blue-dark focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue dark:hover:bg-white/10";

// A section heading's "see more" link (pair it with an ArrowIcon in arrowSlideClass); 44px tall on phones
export const sectionLinkClass =
  "group inline-flex shrink-0 items-center gap-1.5 rounded-control text-base font-semibold text-blue hover:text-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue max-sm:min-h-11";

// An ArrowIcon that slides right while its `group` link is hovered
export const arrowSlideClass = "h-4 w-4 transition-transform duration-200 group-hover:translate-x-1";

// The soft blue box. Light mode mixes the tint into white: over the warm paper, a plain bg-blue/10
// read as the grey disabled fill.
export const tintBox =
  "rounded-lg border border-blue/20 bg-[color-mix(in_srgb,var(--blue)_8%,var(--surface))] dark:bg-blue/10";

// The same box as a link. The hover stops at 14% blue, so blue-dark text keeps 4.5:1 on it.
export const tintLink = `group ${tintBox} transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--blue)_12%,var(--surface))] focus-visible:border-blue focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue dark:hover:bg-blue/14`;

export const labelClass = "mb-2 block text-base font-semibold leading-5 text-ink";

// Phones (below sm): a list of cards as one sideways row running to the screen edge (cancelling the page's
// 16px padding, as Popular destinations does), the first card on the gutter, 12px apart. It swipes natively,
// snaps to each card's start and hides its scrollbar. From sm up the list's own grid classes take over.
// `scroll = false` clips it instead, for a loading row: a scroll box with nothing focusable inside becomes a
// tab stop itself.
export const swipeRowClass = (scroll = true) =>
  `max-sm:-mx-4 max-sm:flex max-sm:gap-3 max-sm:px-4 ${
    scroll
      ? "max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:scroll-px-4 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden"
      : "max-sm:overflow-hidden"
  }`;

// A card in that row; the list adds the card's width (e.g. max-sm:w-[280px])
export const swipeItemClass = "max-sm:shrink-0 max-sm:snap-start";
