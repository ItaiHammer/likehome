"use client";

import { createClient } from "@/utils/supabase/client";
import { API_ROUTES } from "@/constants/routes";

export function SignInWithGoogleOAuthButton() {
    const signIn = async() => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: getRedirectUrl(),
            },
        });
    };

    return <button
            onClick={signIn}
           >
            Sign In With Google
           </button> 
}

function getRedirectUrl(): string {
    const primaryUrl = process.env.NEXT_PUBLIC_SITE_URL; // Set this in prod
    const secondaryUrl = process.env.NEXT_PUBLIC_VERCEL_URL; // Auto set by Vercel

    const url = primaryUrl ?? secondaryUrl ?? 'localhost:3000';
    const protocol = (url?.includes("localhost")) ? 'http' : 'https';
    
    const redirectUrl = `${protocol}://${url}${API_ROUTES.AUTH_CALLBACK}`
    return redirectUrl;
}