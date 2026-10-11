import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'
import { PAGE_ROUTES } from '@/constants/routes'

export async function proxy(request: NextRequest) {
  // /mybookings in any other casing → /MyBookings. Not a next.config redirect: those
  // match without regard to case, so one would also catch /MyBookings and loop.
  const { pathname } = request.nextUrl
  if (pathname !== PAGE_ROUTES.MY_BOOKINGS && pathname.toLowerCase() === PAGE_ROUTES.MY_BOOKINGS.toLowerCase()) {
    const url = request.nextUrl.clone()
    url.pathname = PAGE_ROUTES.MY_BOOKINGS
    return NextResponse.redirect(url)
  }

  return await createClient(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
