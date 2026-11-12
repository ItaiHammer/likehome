"use client";
import { type Provider } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client";
import { oauthRedirectUrl } from "@/lib/auth-redirect";

export function signInWithGoogle() {
    return signIn('google');
}

export function signInWithFacebook() {
    return signIn('facebook');
}

export function signInWithGitHub() {
    return signIn('github');
}

export function signInWithDiscord() {
    return signIn('discord');
}

// Resolves with an error message when the sign-in couldn't start; on success the browser leaves for the provider.
async function signIn(provider: Provider): Promise<string | null> {
    try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: getRedirectUrl() },
        });
        if (error) {
            console.error(`[auth] ${provider} sign-in failed:`, error.message);
            return error.message;
        }
        return null;
    } catch (err) {
        console.error(`[auth] ${provider} sign-in threw:`, err);
        return err instanceof Error ? err.message : "Sign-in failed";
    }
}

function getRedirectUrl(): string {
    // /auth/login?next=/reserve/... (e.g. "Sign in to reserve") → the callback sends people back there
    return oauthRedirectUrl(
        window.location.origin,
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.NEXT_PUBLIC_VERCEL_URL,
        window.location.search,
    );
}
