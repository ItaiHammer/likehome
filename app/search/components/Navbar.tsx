"use client";

import { useState } from "react";
import Link from "next/link";

import LikeHomeLogo from "./LikeHomeLogo";

type NavbarProps = {
    onReturnToStays: () => void;
};

export default function Navbar({ onReturnToStays }: NavbarProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);

    return (
        <div className="relative z-50 w-full bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-10">
                <div className="flex items-center gap-3 md:gap-12">
                    {/* Mobile navigation */}
                    <div className="relative md:hidden">
                        <button
                            type="button"
                            aria-label="Open navigation menu"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => {
                                setMobileMenuOpen((current) => !current);
                                setAccountMenuOpen(false);
                            }}
                            className="flex cursor-pointer items-center justify-center p-1 text-[#070D2F] transition hover:text-[#4C79BD]"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-7 w-7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <path d="M3 6h18" />
                                <path d="M3 12h18" />
                                <path d="M3 18h18" />
                            </svg>
                        </button>

                        {mobileMenuOpen && (
                            <div className="absolute left-0 top-[calc(100%+10px)] z-[100] w-48 overflow-hidden rounded-[8px] border border-[#BACBDF] bg-white py-1 shadow-xl">
                                <Link
                                    href="/search"
                                    onClick={() => {
                                        onReturnToStays();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#4C79BD] transition hover:bg-[#E7EEF8]"
                                >
                                    Stays
                                </Link>

                                {/* TODO(ROUTE): Connect to the authenticated saved-stays page. */}
                                <Link
                                    href="/saved"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full px-4 py-3 text-left text-sm font-medium text-[#070D2F] transition hover:bg-[#E7EEF8] hover:text-[#4C79BD]"
                                >
                                    Saved
                                </Link>

                                {/* TODO(ROUTE): Connect to the user bookings/dashboard page. */}
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full px-4 py-3 text-left text-sm font-medium text-[#070D2F] transition hover:bg-[#E7EEF8] hover:text-[#4C79BD]"
                                >
                                    myBookings
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* The root route currently redirects back to the authenticated search home. */}
                    <Link
                        href="/"
                        aria-label="Return to LikeHome homepage"
                        className="inline-flex items-center"
                    >
                        <LikeHomeLogo />
                    </Link>

                    <nav className="hidden items-center gap-8 text-sm md:flex">
                        <Link
                            href="/search"
                            onClick={onReturnToStays}
                            className="font-semibold text-[#4C79BD] transition hover:text-[#070D2F]"
                        >
                            Stays
                        </Link>

                        {/* TODO(ROUTE): Connect to the authenticated saved-stays page. */}
                        <Link
                            href="/saved"
                            className="font-medium text-[#070D2F] transition hover:text-[#4C79BD]"
                        >
                            Saved
                        </Link>

                        {/* TODO(ROUTE): Connect to the user bookings/dashboard page. */}
                        <Link
                            href="/dashboard"
                            className="font-medium text-[#070D2F] transition hover:text-[#4C79BD]"
                        >
                            myBookings
                        </Link>
                    </nav>
                </div>

                {/* TODO(AUTH): Replace the placeholder initial/account menu with the signed-in user. */}
                <div className="relative">
                    <button
                        type="button"
                        aria-label="Open account menu"
                        aria-expanded={accountMenuOpen}
                        onClick={() => {
                            setAccountMenuOpen((current) => !current);
                            setMobileMenuOpen(false);
                        }}
                        className="flex h-10 w-10 items-center justify-center bg-transparent p-0 text-sm font-semibold text-[#070D2F] transition md:h-auto md:w-auto md:gap-2 md:rounded-[6px] md:border md:border-[#BACBDF] md:bg-white md:px-3 md:py-1.5 md:hover:border-[#4C79BD] md:hover:bg-[#E7EEF8]"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4C79BD] text-xs text-white">
                            R
                        </span>
                        <span className="hidden md:inline">Account</span>
                    </button>

                    {accountMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-[8px] border border-[#BACBDF] bg-white p-2 shadow-lg">
                            <p className="px-3 py-2 text-sm text-[#070D2F]">
                                Account options will go here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
