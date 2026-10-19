"use client";
import { type Provider } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client";
import { API_ROUTES } from "@/constants/routes";

export async function signInWithGoogle() {
    signIn('google');
}

export async function signInWithFacebook() {
    signIn('facebook');
}

export async function signInWithGitHub() {
    signIn('github');
}

export async function signInWithDiscord() {
    signIn('discord');
}

async function signIn(provider: Provider) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getRedirectUrl() },
    });
    if (error) console.error(error.message);
}

function getRedirectUrl(): string {
    const primaryUrl = process.env.NEXT_PUBLIC_SITE_URL; // Set this in prod
    const secondaryUrl = process.env.NEXT_PUBLIC_VERCEL_URL; // Auto set by Vercel

    const url = primaryUrl ?? secondaryUrl ?? 'localhost:3000';
    const protocol = (url?.includes("localhost")) ? 'http' : 'https';
    
    const redirectUrl = `${protocol}://${url}${API_ROUTES.AUTH_CALLBACK}`

    // /auth/login?next=/reserve/... (e.g. "Sign in to reserve") → the callback sends people back there
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") ? `${redirectUrl}?next=${encodeURIComponent(next)}` : redirectUrl;
}