"use client";

import Link from "next/link";
import type { Booking } from "@/lib/bookings";

interface PastBookingProps {
    booking: Booking;
    isCancelled?: boolean;
}

function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function PastBooking({ booking, isCancelled = false }: PastBookingProps) {
    const dates = booking.checkIn && booking.checkOut
        ? `${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)}`
        : booking.checkIn || "";

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-edge bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-4 min-w-0">
                <img
                    src={booking.photoUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"}
                    alt={booking.hotelName}
                    className="h-16 w-24 shrink-0 rounded-xl object-cover bg-paper border border-edge"
                />

                <div className="min-w-0 space-y-0.5">
                    {isCancelled && (
                        <span className="inline-block rounded-full bg-paper border border-edge px-2 py-0.5 text-[10px] font-medium text-slate mb-0.5">
              Cancelled
            </span>
                    )}

                    <h3 className="font-serif text-lg font-bold text-ink truncate">{booking.hotelName}</h3>

                    <p className="text-xs text-slate">{booking.city || "Location"}</p>

                    <p className="text-[11px] text-slate">
                        {dates} {booking.roomType ? `· ${booking.roomType}` : ""} {booking.guests ? `· ${booking.guests} guests` : ""}
                    </p>
                </div>
            </div>

            <div className="shrink-0 pt-2 sm:pt-0">
                <Link
                    href="/search"
                    className="inline-flex h-9 w-full sm:w-auto items-center justify-center rounded-control border border-edge bg-surface px-4 text-xs font-semibold text-ink shadow-2xs transition-colors hover:bg-paper hover:border-slate/40 active:scale-[0.98]"
                >
                    {isCancelled ? "View details" : "Book again"}
                </Link>
            </div>
        </div>
    );
}