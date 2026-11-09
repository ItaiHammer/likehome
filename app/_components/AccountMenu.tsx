"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { initials } from "@/lib/bookings";
import type { NavLink } from "@/lib/account/nav";
import { Popover } from "./ui";

export function AccountMenu({ name, email, link }: { name: string | null; email: string | null; link: NavLink | null }) {
  return (
    <Popover
      label="Account"
      align="right"
      panelClassName="w-[min(16rem,calc(100vw-2rem))]"
      triggerClassName="flex items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      trigger={
        <>
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-blue/15 text-sm font-semibold text-blue-dark">
            {initials(name, email)}
          </span>
          <span className="sr-only">Account</span>
        </>
      }
    >
      {(close) => (
        <div className="flex flex-col">
          {(name || email) && (
            <div className="border-b border-edge pb-3">
              {name && <p className="font-semibold text-ink">{name}</p>}
              {email && <p className="truncate text-sm text-slate">{email}</p>}
            </div>
          )}
          {link && (
            // The header lives in the root layout, so the panel would stay open after navigating
            <Link href={link.href} onClick={close} className="mt-2 rounded-control px-3 py-2 text-base font-medium text-ink hover:text-blue">
              {link.label}
            </Link>
          )}
          <div className={link ? "" : "mt-2"}>
            <SignOutButton />
          </div>
        </div>
      )}
    </Popover>
  );
}
