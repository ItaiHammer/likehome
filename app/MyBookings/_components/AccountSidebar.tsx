import Link from "next/link";
import { Tag } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { initials } from "@/lib/bookings";
import { SignOutButton } from "./SignOutButton";

const SOON_SECTIONS = ["Saved hotels", "Personal details", "Payment methods", "Notifications"];

export function AccountSidebar({ name, email, className = "" }: { name: string | null; email: string | null; className?: string }) {
  return (
    <aside aria-label="Your account" className={`rounded-lg border border-edge bg-surface p-4 ${className}`}>
      <div className="flex items-center gap-3 p-2">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-sm font-semibold text-blue-dark">
          {initials(name, email)}
        </span>
        <div className="min-w-0">
          {name && <p className="truncate font-semibold text-ink">{name}</p>}
          {email && <p className="truncate text-sm text-slate">{email}</p>}
        </div>
      </div>

      <nav aria-label="Account sections" className="mt-3">
        <ul className="space-y-1">
          <li>
            <Link href={PAGE_ROUTES.MY_BOOKINGS} aria-current="page" className="block rounded-control bg-blue/10 px-3 py-2.5 text-sm font-semibold text-blue-dark">
              Reservations
            </Link>
          </li>
          {SOON_SECTIONS.map((label) => (
            <li key={label}>
              <span aria-disabled="true" title="Coming soon" className="flex cursor-not-allowed items-center justify-between gap-2 px-3 py-2.5 text-sm text-slate">
                {label}
                <Tag>Soon</Tag>
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <SignOutButton className="mt-4 w-full" />
    </aside>
  );
}
