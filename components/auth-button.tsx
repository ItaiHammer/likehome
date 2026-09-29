import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { SignInWithGoogleOAuthButton } from "./sign-in-google-button";
import { SignOutButton } from "./sign-out-button";

export async function AuthButton() {
    const supabase = createClient(await cookies());

    // Faster than getUser()
    const { data } = await supabase.auth.getClaims();
    const user = data?.claims; 

    return user ? (
        <SignOutButton />
    ) : (
        <SignInWithGoogleOAuthButton/>
    );
}