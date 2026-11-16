"use client";

import { useSyncExternalStore } from "react";
import { getSavedIds, getServerSavedIds, subscribeSavedIds, toggleSavedHotel } from "@/lib/saved-hotels";

interface SaveHotelButtonProps {
    hotelId: string;
    className?: string;
}

export function SaveHotelButton({ hotelId, className = "" }: SaveHotelButtonProps) {
    const savedIds = useSyncExternalStore(subscribeSavedIds, getSavedIds, getServerSavedIds);
    const isSaved = savedIds.includes(String(hotelId));

    const toggleSave = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSavedHotel(String(hotelId));
    };

    return (
        <button
            type="button"
            onClick={toggleSave}
            aria-label={isSaved ? "Remove from saved hotels" : "Save hotel"}
            style={{ backgroundColor: "#ffffff" }}
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white !bg-white border border-slate-200/80 shadow-md transition-all hover:scale-110 active:scale-95 ${className}`}
        >
            <svg
                className="h-4 w-4 transition-colors"
                viewBox="0 0 24 24"
                fill={isSaved ? "#ef4444" : "none"}
                stroke={isSaved ? "#ef4444" : "#475569"}
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
            </svg>
        </button>
    );
}