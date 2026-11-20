import Link from "next/link";
import { Tag } from "@/app/_components/ui";
import { AccountSidebarFrame } from "@/app/_components/AccountSidebarFrame";
import { PAGE_ROUTES } from "@/constants/routes";

const SOON_SECTIONS = ["Saved hotels", "Personal details", "Payment methods", "Notifications"];

export function AccountSidebar({
  name,
  email,
  className = "",
}: {
  name: string | null;
  email: string | null;
  className?: string;
}) {
  return (
    <AccountSidebarFrame name={name} email={email} label="Your account" className={className}>
      <li>
        <Link
          href={PAGE_ROUTES.MY_BOOKINGS}
          aria-current="page"
          className="block rounded-control bg-blue/10 px-3 py-2.5 text-sm font-semibold text-blue-dark"
        >
          Reservations
        </Link>
      </li>
      {SOON_SECTIONS.map((section) => (
        <li key={section}>
          <span
            aria-disabled="true"
            title="Coming soon"
            className="flex cursor-not-allowed items-center justify-between gap-2 px-3 py-2.5 text-sm text-slate"
          >
            {section}
            <Tag>Soon</Tag>
          </span>
        </li>
      ))}
    </AccountSidebarFrame>
  );
}
