import { initials } from "@/lib/bookings";
import { SignOutButton } from "@/app/MyBookings/_components/SignOutButton";

// Shared visual shell for My Bookings and all property-owner pages.
// Keeping the frame here ensures both sidebars have identical styling.
export function AccountSidebarFrame({
  name,
  email,
  label,
  children,
  className = "",
}: {
  name: string | null;
  email: string | null;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      aria-label={label}
      className={`rounded-lg border border-edge bg-surface p-4 ${className}`}
    >
      <div className="flex items-center gap-3 p-2">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-sm font-semibold text-blue-dark"
        >
          {initials(name, email)}
        </span>
        <div className="min-w-0">
          {name && <p className="truncate font-semibold text-ink">{name}</p>}
          {email && <p className="truncate text-sm text-slate">{email}</p>}
        </div>
      </div>

      <nav aria-label={label} className="mt-3">
        <ul className="space-y-1">{children}</ul>
      </nav>

      <SignOutButton className="mt-4 w-full" />
    </aside>
  );
}
