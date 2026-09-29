// Shared controls from the LikeHome component sheet:
// 46px-tall inputs and buttons, 6.4px corners, 16px text inset.

export const buttonPrimary =
  "inline-flex h-[46px] items-center justify-center gap-2 rounded-control bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted";

export const buttonSecondary =
  "inline-flex h-[46px] items-center justify-center gap-2 rounded-control border border-line bg-surface px-6 text-base font-semibold text-ink transition-colors hover:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:cursor-not-allowed disabled:border-disabled disabled:bg-disabled disabled:text-muted";

// Square 46px version of buttonSecondary for icon-only controls (steppers, arrows, close).
export const iconButton =
  "inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink transition-colors hover:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:cursor-not-allowed disabled:border-disabled disabled:bg-disabled disabled:text-muted";

export const inputClass = (error?: boolean) =>
  `h-[46px] w-full rounded-control border bg-surface px-4 text-base text-ink placeholder:text-muted outline-none transition focus:ring-1 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted ${
    error ? "border-danger focus:border-danger focus:ring-danger" : "border-line focus:border-brand focus:ring-brand"
  }`;

export const labelClass = "mb-2 block text-base font-semibold leading-5 text-ink";

export function Field({
  id,
  label,
  error,
  hint,
  className = "",
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className={inputClass(!!error)} {...input} />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink">
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-brand" fill="currentColor" aria-hidden>
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
      </svg>
      <span className="font-semibold">{rating.toFixed(2)}</span>
      {reviews !== undefined && <span className="text-muted">· {reviews} reviews</span>}
    </span>
  );
}
