import { NextResponse } from 'next/server'
import { cookies } from "next/headers";
import { createClient } from '@/utils/supabase/server'
import { PAGE_ROUTES } from '@/constants/routes';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getNext(searchParams.get('next'));

  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const redirectUrl = getRedirectUrl(origin, forwardedHost, next);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(`${origin}${PAGE_ROUTES.AUTH_ERROR}`)
}

function getNext(next: string | null): string {
  let result = '/';
  if ((next && next.startsWith('/'))) {
    result = next;
  }

  return result;
}

function getRedirectUrl(origin: string, forwardedHost: string | null, next: string) {
  let redirectUrl = `${origin}${next}`
  if (process.env.NODE_ENV !== 'development' &&
      forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
  }
  return redirectUrl;
}

