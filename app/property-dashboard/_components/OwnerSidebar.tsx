import Link from "next/link";
import { AccountSidebarFrame } from "@/app/_components/AccountSidebarFrame";

const sections = [
  { label: "My listings", href: "/listings", key: "listings" },
  { label: "Customers", href: "/property-dashboard/customers", key: "customers" },
  { label: "Messages", href: "/property-dashboard/messages", key: "messages" },
] as const;

type ActiveSection = (typeof sections)[number]["key"];

export function OwnerSidebar({
  active,
  name,
  email,
  className = "",
}: {
  active: ActiveSection;
  name: string | null;
  email: string | null;
  className?: string;
}) {
  return (
    <AccountSidebarFrame name={name} email={email} label="Property sections" className={className}>
      {sections.map((section) => {
        const selected = section.key === active;
        return (
          <li key={section.key}>
            <Link
              href={section.href}
              aria-current={selected ? "page" : undefined}
              className={`block rounded-control px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue ${
                selected
                  ? "bg-blue/10 text-blue-dark"
                  : "text-slate hover:bg-blue/5 hover:text-ink"
              }`}
            >
              {section.label}
            </Link>
          </li>
        );
      })}
    </AccountSidebarFrame>
  );
}
