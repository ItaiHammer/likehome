# US2.1 Account Creation — QA 2.1.5 (Debugging and Retesting)

## Automated tests

```bash
npm test                                   # whole suite
node --experimental-strip-types --test tests/auth-redirect.test.mjs   # account creation only (16 tests)
```

## Bugs found and fixed

| # | Severity | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | High | `app/auth/login/sign-in-handler.tsx` | The OAuth callback URL was built from env vars instead of the page's origin. Supabase keeps the PKCE verifier cookie on the origin the user is on, so signing in from a Vercel preview URL (or www vs. apex) with `NEXT_PUBLIC_SITE_URL` pointing elsewhere sends the user to `/auth/error`. | Use `window.location.origin` first, with env vars as a fallback (`lib/auth-redirect.ts`). |
| 2 | High | same | `NEXT_PUBLIC_SITE_URL` with a protocol produced `https://https://…`, a trailing slash produced `//api/…`, an empty value produced `https:///api/…`, and `127.0.0.1` got `https`. | `normalizeOrigin()` accepts all of these forms. |
| 3 | Medium | `app/auth/login/page.tsx` | Clicking a provider twice (or two providers) started two OAuth flows. The second overwrote the PKCE cookie, so the first callback failed. | Buttons disable while a sign-in is starting. |
| 4 | Medium | same | When sign-in couldn't start, the error went only to `console.error` and the user saw nothing. Handlers weren't awaited, so a thrown error became an unhandled rejection. | Handlers return an error message, and the page shows it in a `role="alert"`. |
| 5 | Low | `app/auth/error/page.tsx` | The page always said "The Google sign-in…", even for Facebook, GitHub and Discord. | Wording is now provider-neutral. |
| 6 | Low | `app/api/auth/callback/route.ts` | A failed code exchange or a provider `error=` came back with no log, so failures couldn't be debugged. | Both are now logged with `console.error('[auth] …')`. |
| 7 | Low (security hardening) | callback, error page, login | `next` was only checked with `startsWith('/')`, which lets `//evil.com` and `/\evil.com` through. | `safeNext()` rejects both. Today the host is always prefixed, so this wasn't exploitable, but the check is now safe anywhere it's used. |
| 8 | Perf | `utils/supabase/middleware.ts` | `getUser()` ran on every request after `getClaims()` and its result was unused, adding a network round trip to Supabase Auth on every page load. | Removed. `getClaims()` already validates and refreshes the session. |

## Manual test checklist (run on localhost and on the Vercel preview)

Before testing, add `http://localhost:3000/**` and `https://*-<team>.vercel.app/**` to
Supabase → Authentication → URL Configuration → Redirect URLs.

| ID | Steps | Expected |
|---|---|---|
| AC-01 | New user: Sign in → Google | Lands on `/`, nav shows "Sign Out", a row exists in `public.accounts` |
| AC-02 | Same as AC-01 with Facebook, GitHub, Discord | Same as AC-01 |
| AC-03 | Same user signs in again | No duplicate `accounts` row |
| AC-04 | Signed out → open a stay → "Sign in to reserve" | After login, back on the same stay with the same dates and guests |
| AC-05 | Cancel on the provider's consent screen | `/auth/error` → "Try again" keeps `next` |
| AC-06 | Double-click a provider button | Only one redirect, login succeeds |
| AC-07 | Signed out → `/MyBookings` | Redirects to `/auth/login` |
| AC-08 | After login → `/MyBookings` | Name and email from `accounts` appear in the sidebar |
| AC-09 | Sign Out | Back on `/auth/login`, `/MyBookings` redirects again |
| AC-10 | Open `/api/auth/callback?code=bad` | `/auth/error`, server log shows `[auth] code exchange failed` |

## Database checks (Supabase SQL editor, read-only)

The `accounts` table and its signup trigger (2.1.4) aren't in `supabase/migrations`, so these
queries confirm they exist on the live project:

```sql
-- 1. A trigger on auth.users creates the account row
select tgname, pg_get_triggerdef(t.oid)
from pg_trigger t where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- 2. Every user has an account (should return 0 rows)
select u.id, u.email from auth.users u
left join public.accounts a on a.id = u.id where a.id is null;

-- 3. RLS is on and users can only read and update their own row
select relrowsecurity from pg_class where oid = 'public.accounts'::regclass;
select policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'accounts';

-- 4. Columns the app reads (full_name, email) exist
select column_name, data_type, is_nullable from information_schema.columns
where table_schema = 'public' and table_name = 'accounts';
```

If query 2 returns rows (users created before the trigger existed), backfill them:

```sql
insert into public.accounts (id, email, full_name)
select u.id, u.email, u.raw_user_meta_data->>'full_name'
from auth.users u left join public.accounts a on a.id = u.id
where a.id is null;
```

Recommendation: copy the `accounts` table, trigger and policies into
`supabase/migrations/` so the schema is version-controlled like the rest.
