"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PAGE_ROUTES } from "@/constants/routes";

export function SignOutButton() {
    const router = useRouter();

    const signOut = async() => {
        const supabase = createClient();
        await supabase.auth.signOut();
        // Refresh page to update button
        router.push(PAGE_ROUTES.LOGIN);
    };

    return <button
            onClick={signOut}
           >
            Sign Out
           </button> 

}