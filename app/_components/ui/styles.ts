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
  `h-[46px] w-full rounded-control border bg-surface px-4 text-base text-ink placeholder:text-slate transition focus:outline-hidden focus:ring-1 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-slate ${
    error ? "border-danger focus:border-danger focus:ring-danger" : "border-edge focus:border-blue focus:ring-blue"
  }`;

export const labelClass = "mb-2 block text-base font-semibold leading-5 text-ink";
