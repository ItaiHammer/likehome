"use client";

import { useRouter } from "next/navigation";
import { headerAuthLinkClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";

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
