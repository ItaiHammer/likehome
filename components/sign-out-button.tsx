"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PAGE_ROUTES } from "@/constants/routes";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign-out failed:", error.message);
      return;
    }

    router.push(PAGE_ROUTES.LOGIN);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-control px-3 py-2 text-base font-semibold text-blue hover:text-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
    >
      Sign Out
    </button>
  );
}