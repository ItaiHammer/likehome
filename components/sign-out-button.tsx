"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PAGE_ROUTES } from "@/constants/routes";
import { authLinkClass, headerAuthLinkClass } from "./sign-in-button";

export function SignOutButton({ inHeader = false }: { inHeader?: boolean }) {
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
      className={inHeader ? headerAuthLinkClass : `${authLinkClass} px-3`}
    >
      Sign out
    </button>
  );
}