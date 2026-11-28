"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { firstName, initials } from "@/lib/bookings";
import type { NavLink } from "@/lib/account/nav";
import { Popover } from "./ui";

function Avatar({ name, email }: { name: string | null; email: string | null }) {
  return (
    <span aria-hidden className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full bg-[#3d66a6] text-[11px] font-semibold text-white">
      {initials(name, email)}
    </span>
  );
}

// Trigger and panel from the Rewards Flow Figma's "Dropdown - Header Interaction"
export function AccountMenu({
  name,
  email,
  accountLabel,
  items,
}: {
  name: string | null;
  email: string | null;
  accountLabel: string | null;
  items: NavLink[];
}) {
  return (
    <Popover
      label="Account"
      align="right"
      panelClassName="w-[min(15rem,calc(100vw-2rem))]"
      triggerClassName="flex h-9 items-center gap-2 rounded-xl border border-edge bg-surface pl-1.5 pr-2 text-xs text-ink transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      trigger={
        <>
          <Avatar name={name} email={email} />
          <span className="sr-only sm:not-sr-only sm:max-w-[8rem] sm:truncate">{firstName(name) ?? "Account"}</span>
          <span className="sr-only">, account menu</span>
        </>
      }
    >
      {(close) => (
        <div className="flex flex-col">
          {(name || email) && (
            <div className="flex items-center gap-3 rounded-lg border border-edge px-3 py-2">
              <Avatar name={name} email={email} />
              <div className="min-w-0">
                {name && <p className="truncate text-sm font-semibold text-ink">{name}</p>}
                {email && <p className="truncate text-xs text-slate">{email}</p>}
              </div>
            </div>
          )}
          {accountLabel && <p className="mt-2 px-3 text-xs font-semibold text-blue">{accountLabel}</p>}
          <ul className="mt-2 flex flex-col">
            {items.map((item) => (
              <li key={item.label}>
                {/* The header lives in the root layout, so the panel would stay open after navigating */}
                <Link href={item.href} onClick={close} className="block rounded-control px-3 py-2 text-sm text-ink hover:text-blue-dark">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-edge pt-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </Popover>
  );
}
