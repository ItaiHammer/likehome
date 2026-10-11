// Checkbox from the LikeHome component sheet: edge border, blue fill with a white tick when checked.
// A real <input type="checkbox"> underneath, so keyboard, forms and screen readers work as usual.
// Candidate for Nolan's shared app/_components/ui once he agrees.
export function Checkbox({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-ink">
      <span className="relative flex h-5 w-5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-edge bg-surface transition-colors checked:border-blue checked:bg-blue hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        />
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute inset-0 hidden h-5 w-5 text-on-blue peer-checked:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5.5 10.5l3 3 6-7" />
        </svg>
      </span>
      {label}
    </label>
  );
}
