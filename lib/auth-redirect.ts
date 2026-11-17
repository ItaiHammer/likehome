// Pure helpers for the OAuth sign-in round trip (login page → provider → /api/auth/callback → next).
// Kept free of Next/Supabase imports so they can be unit tested (tests/auth-redirect.test.mjs).

const CALLBACK_PATH = "/api/auth/callback";

/**
 * Only same-site paths are allowed as a post-login destination.
 * "//evil.com" and "/\evil.com" start with "/" but browsers treat them as another host.
 */
export function safeNext(next: string | null | undefined): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/**
 * The URL the provider sends the user back to after they approve.
 *
 * Prefers the origin the user is on right now: Supabase keeps the PKCE code verifier in a cookie
 * on that origin, so a callback on any other host (prod domain vs. a Vercel preview URL, www vs.
 * apex) can't exchange the code and lands on /auth/error.
 */
export function oauthRedirectUrl(currentOrigin: string | null, siteUrl?: string, vercelUrl?: string, search = ""): string {
  const base = normalizeOrigin(currentOrigin) ?? normalizeOrigin(siteUrl) ?? normalizeOrigin(vercelUrl) ?? "http://localhost:3000";
  const callback = `${base}${CALLBACK_PATH}`;

  const next = new URLSearchParams(search).get("next");
  const target = safeNext(next);
  return target === "/" ? callback : `${callback}?next=${encodeURIComponent(target)}`;
}

/** Where /api/auth/callback sends the user once the session exists. */
export function postLoginUrl(origin: string, forwardedHost: string | null, next: string | null, isDev: boolean): string {
  const path = safeNext(next);
  if (!isDev && forwardedHost) return `https://${forwardedHost}${path}`;
  return `${origin}${path}`;
}

/** "/auth/error" plus ?next= so "Try again" still returns the user where they were headed. */
export function authErrorPath(next: string | null): string {
  const path = safeNext(next);
  return path === "/" ? "/auth/error" : `/auth/error?next=${encodeURIComponent(path)}`;
}

/** "/auth/login" plus ?next= when there is somewhere to go back to. */
export function loginPath(next: string | null | undefined): string {
  const path = safeNext(next);
  return path === "/" ? "/auth/login" : `/auth/login?next=${encodeURIComponent(path)}`;
}

// Accepts "likehome.app", "https://likehome.app/", "localhost:3000", "127.0.0.1:3000"; "" → null.
function normalizeOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(raw);
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `${local ? "http" : "https"}://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}
