"use client";

import { useRouter } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";

export const authLinkClass =
  "rounded-control py-2 text-base font-semibold text-blue hover:text-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";

// Tighter on phones so "Sign out" stays on one line beside the Menu button at 360px
export const headerAuthLinkClass = `${authLinkClass} whitespace-nowrap px-2 sm:px-3`;

export function SignInButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(PAGE_ROUTES.LOGIN)}
      className={headerAuthLinkClass}
    >
      Sign in
    </button>
  );
}
