import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { ROUTE_PREFIXES, PAGE_ROUTES } from "@/constants/routes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  // Recommended to use getClaims for page protection
  // getClaims should be called immediately after createServerClient
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith(ROUTE_PREFIXES.PROTECTED);

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = PAGE_ROUTES.LOGIN;
    return NextResponse.redirect(url);
  }

  return supabaseResponse
};