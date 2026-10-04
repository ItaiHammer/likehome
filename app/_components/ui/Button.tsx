"use client";

// Client component: the loading state needs a click handler.
import Link from "next/link";
import { buttonClass, iconButtonClass, type ButtonVariant, type ControlSize } from "./styles";

type Common = {
  variant?: ButtonVariant;
  size?: ControlSize;
  className?: string;
  children: React.ReactNode;
};

type AsButton = Common & {
  href?: undefined;
  /** Shows a spinner and ignores clicks, but keeps focus (buttons only) */
  loading?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type AsLink = Common & { href: string; loading?: never } & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">;

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The site's button. Primary for the main action on a screen, secondary for
 * everything else, ghost for low-key text actions. Pass `href` to get a link
 * that looks like a button.
 *
 *   <Button>Create account</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button href="/auth/login">Join</Button>
 */
export function Button({ variant = "primary", size = "md", className = "", children, ...rest }: AsButton | AsLink) {
  const classes = `${buttonClass(variant, size)} ${className}`;

  if (rest.href !== undefined) {
    const { href, ...link } = rest; // `loading` can't be passed to a link (typed `never`)
    return (
      <Link href={href} className={classes} {...link}>
        {children}
      </Link>
    );
  }

  const { type = "button", loading = false, onClick, ...button } = rest as Omit<AsButton, keyof Common>;
  // While loading: aria-disabled (not disabled) so a focused button keeps focus,
  // clicks are ignored, and screen readers hear "loading"
  return (
    <button
      type={type}
      aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={`${classes} ${loading ? "opacity-80" : ""}`}
      {...button}
    >
      {loading && <Spinner />}
      {children}
      {loading && <span className="sr-only">, loading</span>}
    </button>
  );
}

/**
 * Square outline button with just an icon. `label` is required: it's what
 * screen readers announce and what shows on hover.
 *
 *   <IconButton label="Next"><ChevronRight /></IconButton>
 */
export function IconButton({
  label,
  size = "md",
  className = "",
  type = "button",
  children,
  ...button
}: {
  label: string;
  size?: ControlSize;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "aria-label">) {
  return (
    <button type={type} aria-label={label} title={label} className={`${iconButtonClass(size)} ${className}`} {...button}>
      {children}
    </button>
  );
}
