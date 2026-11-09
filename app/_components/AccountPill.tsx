import { Tag } from "./ui";

// From tablet width up; on phones the label is the first row of the menu
export function AccountPill({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className="hidden md:inline-flex">
      <Tag tone="blue">{label}</Tag>
    </span>
  );
}
