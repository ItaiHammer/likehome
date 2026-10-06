import { inputClass, labelClass } from "./styles";

type FieldBase = {
  id: string;
  label: string;
  /** Shown in red under the control; also marks it invalid */
  error?: string;
  /** Helper text under the control (hidden while there's an error) */
  hint?: string;
  className?: string;
};

// Label above, message below: the same frame for every kind of field
function FieldFrame({ id, label, error, hint, className = "", children }: FieldBase & { children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

/**
 * Text input with its label and an optional hint or error.
 *
 *   <Field id="email" label="Email address" type="email" error={errors.email} />
 */
export function Field({ id, label, error, hint, className, ...input }: FieldBase & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} className={className}>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)} className={inputClass(!!error)} {...input} />
    </FieldFrame>
  );
}

/**
 * Multi-line text box, same look as Field.
 *
 *   <TextArea id="requests" label="Special requests (optional)" rows={3} />
 */
export function TextArea({ id, label, error, hint, className, rows = 3, ...textarea }: FieldBase & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={`${inputClass(!!error)} h-auto resize-none py-3`}
        {...textarea}
      />
    </FieldFrame>
  );
}

/**
 * Dropdown for picking one option. It's the browser's own select, styled to
 * match (its popup follows light/dark mode via color-scheme).
 *
 *   <Select id="sort" label="Sort by" options={[{ value: "price", label: "Price" }]} />
 */
export function Select({
  id,
  label,
  error,
  hint,
  className,
  options,
  ...select
}: FieldBase & { options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={`${inputClass(!!error)} cursor-pointer appearance-none pr-11`}
          {...select}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5.5 7.5L10 12l4.5-4.5" />
        </svg>
      </div>
    </FieldFrame>
  );
}
