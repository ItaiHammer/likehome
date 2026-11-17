import { NextResponse } from 'next/server'
import { cookies } from "next/headers";
import { createClient } from '@/utils/supabase/server'
import { authErrorPath, postLoginUrl } from '@/lib/auth-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      return NextResponse.redirect(postLoginUrl(origin, forwardedHost, next, process.env.NODE_ENV === 'development'));
    }
    console.error('[auth] code exchange failed:', error.message);
  } else {
    // Provider sent the user back without a code (cancelled, or provider/config error)
    const reason = searchParams.get('error_description') ?? searchParams.get('error');
    if (reason) console.error('[auth] provider returned an error:', reason);
  }

  // Pass `next` along so "Try again" on the error page still returns the user there
  return NextResponse.redirect(`${origin}${authErrorPath(next)}`)
}
