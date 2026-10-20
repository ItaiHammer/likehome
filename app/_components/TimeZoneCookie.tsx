"use client";

import { useEffect } from "react";
import { TZ_COOKIE } from "@/utils/tz-cookie";
import { browserTimeZone } from "./dates";

// Saves the browser's time zone in a cookie so server-rendered pages (My Bookings)
// can work out the guest's "today" instead of UTC's. Renders nothing.
export function TimeZoneCookie() {
  useEffect(() => {
    const tz = browserTimeZone();
    if (!tz) return;
    const current = document.cookie.split("; ").find((c) => c.startsWith(`${TZ_COOKIE}=`))?.split("=")[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
