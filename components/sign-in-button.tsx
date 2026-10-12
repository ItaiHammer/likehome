"use client";

import { useRouter } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";

export function SignInButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(PAGE_ROUTES.LOGIN)}
      className="rounded-control px-3 py-2 text-base font-semibold text-blue hover:text-blue-dark"
    >
      Sign in
    </button>
  );
}