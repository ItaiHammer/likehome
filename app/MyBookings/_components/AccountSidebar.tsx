"use client";

import Link from "next/link";
import { PAGE_ROUTES } from "@/constants/routes";
import { initials } from "@/lib/bookings";
import { SignOutButton } from "./SignOutButton";

export type AccountTab = "reservations" | "saved" | "account";

interface AccountSidebarProps {
    name: string | null;
    email: string | null;
    activeTab?: AccountTab;
    className?: string;
}

const SIDEBAR_ITEMS: { id: AccountTab; label: string; icon: React.ReactNode; path: string }[] = [
    {
        id: "reservations",
        label: "Reservations",
        path: PAGE_ROUTES.MY_BOOKINGS,
        icon: (
            <svg className="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        id: "saved",
        label: "Saved hotels",
        path: `${PAGE_ROUTES.MY_BOOKINGS}?tab=saved`,
        icon: (
            <svg className="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
    },
    {
        id: "account",
        label: "Account",
        path: `${PAGE_ROUTES.MY_BOOKINGS}?tab=account`,
        icon: (
            <svg className="h-4 w-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export function AccountSidebar({
                                   name,
                                   email,
                                   activeTab = "reservations",
                                   className = "",
                               }: AccountSidebarProps) {
    return (
        <aside
            aria-label="Your account"
            className={`rounded-lg border border-edge bg-surface p-4 ${className}`}
        >
            <div className="flex items-center gap-3 p-2">
        <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-sm font-semibold text-blue-dark"
        >
          {initials(name, email)}
        </span>
                <div className="min-w-0">
                    {name && <p className="truncate font-semibold text-ink">{name}</p>}
                    {email && <p className="truncate text-sm text-slate">{email}</p>}
                </div>
            </div>

            <nav aria-label="Account sections" className="mt-3">
                <ul className="space-y-1">
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.path}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors ${
                                        isActive
                                            ? "bg-blue/10 text-blue-dark"
                                            : "text-slate hover:bg-paper hover:text-ink"
                                    }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <SignOutButton className="mt-4 w-full" />
        </aside>
    );
}