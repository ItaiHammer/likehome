import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { ROUTE_PREFIXES, PAGE_ROUTES, ROUTE_ACCESS, type RouteAccess } from "@/constants/routes";
import { getUserId } from "../user";
import { type AccountType, getAccountType } from "../accounts";

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

  const access: RouteAccess = await getRouteAccess(request);
  
  const url = request.nextUrl.clone();

  switch (access) {
    case 'permitted':
      return supabaseResponse
    case 'unauthorized':
      url.pathname = PAGE_ROUTES.AUTHORIZATION_ERROR;
      break;
    case 'unauthenticated':
    default:
      url.pathname = PAGE_ROUTES.LOGIN;
  }

  url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
};

const getRouteAccess = async (request: NextRequest): Promise<RouteAccess> => {
  // Recommended to use getClaims for page protection
  // getClaims should be called immediately after createServerClient
  const { userId } = await getUserId();

  const isBusinessRoute = ROUTE_PREFIXES.BUSINESS.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  const isPersonalRoute = ROUTE_PREFIXES.PERSONAL.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  
  if (isBusinessRoute || isPersonalRoute) {
    if (userId) {
      const { data, error } = await getAccountType(userId);
      // navigate to sign in/up
      if (!data || error) return ROUTE_ACCESS.UNAUTHENTICATED;

      switch (data as AccountType) {
        case 'business':
          if (isBusinessRoute) return ROUTE_ACCESS.PERMITTED;
          return ROUTE_ACCESS.UNAUTHORIZED;
        case 'personal':
          if (isPersonalRoute) return ROUTE_ACCESS.PERMITTED;
          return ROUTE_ACCESS.UNAUTHORIZED;
        default:
          return ROUTE_ACCESS.UNAUTHORIZED;
      }
    } 
    return ROUTE_ACCESS.UNAUTHENTICATED;
  } 
  return ROUTE_ACCESS.PERMITTED;
}

