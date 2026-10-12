"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { createClient } from "@/utils/supabase/client";

// components/sign-out-button.tsx does the same but is unstyled
export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push(PAGE_ROUTES.LOGIN);
    router.refresh();
  }

  return (
    <Button variant="secondary" loading={signingOut} onClick={signOut} className={className}>
      Sign out
    </Button>
  );
}
