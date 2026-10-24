import { useId } from "react";

type Props = {
  title: string;
  description: string;
  // For a set of checkboxes: announces the title and description as the group's name and hint.
  group?: boolean;
  children: React.ReactNode;
};

// One editor section: title and description on the left, controls on the right (stacked on small screens).
export function FormSection({ title, description, group = false, children }: Props) {
  const id = useId();
  return (
    <section className="grid gap-4 lg:grid-cols-[13rem_1fr] lg:gap-10">
      <div>
        <h3 id={`${id}-title`} className="text-lg font-medium text-ink">
          {title}
        </h3>
        <p id={`${id}-description`} className="mt-1 text-slate">
          {description}
        </p>
      </div>
      {group ? (
        <div role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
