"use client";

import { createClient } from "@/utils/supabase/client";
import { API_ROUTES } from "@/constants/routes";

export async function signInWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getRedirectUrl() },
    });
    if (error) console.error(error.message);
}

export function SignInWithGoogleOAuthButton() {
    return <button onClick={signInWithGoogle}>Sign In With Google</button>;
}

function getRedirectUrl(): string {
    const primaryUrl = process.env.NEXT_PUBLIC_SITE_URL; // Set this in prod
    const secondaryUrl = process.env.NEXT_PUBLIC_VERCEL_URL; // Auto set by Vercel

    const url = primaryUrl ?? secondaryUrl ?? 'localhost:3000';
    const protocol = (url?.includes("localhost")) ? 'http' : 'https';
    
    const redirectUrl = `${protocol}://${url}${API_ROUTES.AUTH_CALLBACK}`
    return redirectUrl;
}