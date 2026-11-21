import {initials} from "@/lib/bookings";
import {SignOutButton} from "@/app/MyBookings/_components/SignOutButton";

// One shared sidebar style for traveler and property-owner navigation.
// Small screens get a compact, native expandable menu;
// desktop keeps the full card.
function SidebarContents({
                             name,
                             email,
                             label,
                             children,
                         }: {
    name: string | null;
    email: string | null;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <>
            <div className="flex items-center gap-3 p-2">
        <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-sm font-semibold text-blue-dark"
        >
          {initials(name, email)}
        </span>

                <div className="min-w-0">
                    {name && (
                        <p className="truncate font-semibold text-ink">
                            {name}
                        </p>
                    )}

                    {email && (
                        <p className="truncate text-sm text-slate">
                            {email}
                        </p>
                    )}
                </div>
            </div>

            <nav aria-label={label} className="mt-3">
                <ul className="space-y-1">{children}</ul>
            </nav>

            <SignOutButton className="mt-4 w-full"/>
        </>
    );
}

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
        <>
            {/* Compact menu on phones and tablets. */}
            <details
                className={`group w-full rounded-lg border border-edge bg-surface lg:hidden ${className}`}
            >
                <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-blue [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-xs font-semibold text-blue-dark"
            >
              {initials(name, email)}
            </span>

            <span className="min-w-0 truncate text-sm">
              {label}
            </span>
          </span>

                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 shrink-0 text-slate transition-transform group-open:rotate-180"
                    >
                        <path d="m6 9 6 6 6-6"/>
                    </svg>
                </summary>

                <div className="border-t border-edge px-4 pb-4 pt-2">
                    <SidebarContents
                        name={name}
                        email={email}
                        label={label}
                    >
                        {children}
                    </SidebarContents>
                </div>
            </details>

            {/* Full sidebar on desktop. */}
            <aside
                aria-label={label}
                className={`hidden rounded-lg border border-edge bg-surface p-4 lg:block ${className}`}
            >
                <SidebarContents
                    name={name}
                    email={email}
                    label={label}
                >
                    {children}
                </SidebarContents>
            </aside>
        </>
    );
}