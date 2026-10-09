"use client";

import Link from "next/link";

interface AuthBannerProps {
  isSignedIn: boolean;
  userEmail?: string;
  onSignOut: () => void;
}

export default function AuthBanner({
  isSignedIn,
  userEmail,
  onSignOut,
}: AuthBannerProps) {
  if (isSignedIn) {
    return (
      <div className="rounded-xl border border-edge bg-blue/10 p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue text-white font-semibold">
              ✓
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue">
                Signed In Account
              </p>
              <p className="text-base font-bold text-ink">{userEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm font-semibold text-slate hover:text-ink underline underline-offset-4 self-start sm:self-auto"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">
              Account Required to Complete Booking
            </h3>
            <p className="text-sm text-slate">
              Please sign in or create a LikeHome account to continue checkout and save your reservation details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/login?redirect=/reserve"
            className="inline-flex h-[42px] items-center justify-center rounded-[6.4px] bg-blue px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-xs"
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    </div>
  );
}