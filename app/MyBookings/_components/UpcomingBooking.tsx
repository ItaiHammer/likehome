"use client";

import Link from "next/link";
import type { Booking } from "@/lib/bookings";

interface UpcomingBookingProps {
    booking: Booking;
    href: string;
    priority?: boolean;
}

function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function UpcomingBooking({ booking, href }: UpcomingBookingProps) {
    const dates = booking.checkIn && booking.checkOut
        ? `${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)}`
        : booking.checkIn || "";

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-edge bg-surface p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                <img
                    src={booking.photoUrl || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80"}
                    alt={booking.hotelName}
                    className="h-28 w-full sm:w-40 shrink-0 rounded-xl object-cover bg-paper border border-edge"
                />

                <div className="min-w-0 space-y-1">
          <span className="inline-block rounded-full bg-paper border border-edge/80 px-2.5 py-0.5 text-[11px] font-medium text-slate">
            Confirmed
          </span>

                    <h3 className="font-serif text-xl font-bold text-ink truncate">{booking.hotelName}</h3>

                    <p className="text-xs text-slate">{booking.city || "Location"}</p>

                    <p className="text-xs text-slate">
                        {dates} {booking.roomType ? `· ${booking.roomType}` : ""} {booking.guests ? `· ${booking.guests} guests` : ""}
                    </p>

                    <p className="text-[11px] text-slate/80 font-mono pt-0.5">
                        Booking {booking.id.toUpperCase().slice(0, 12)}
                    </p>
                </div>
            </div>

            <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                    href={href}
                    className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-control bg-blue px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-dark active:scale-[0.98]"
                >
                    View booking
                </Link>
            </div>
        </div>
    );
}