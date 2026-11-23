"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";

interface SaveHotelButtonProps {
    hotelId: string;
    className?: string;
}

const SAVED_KEY = "likehome_saved_hotels";

function readSavedHotels(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
        return [];
    }
}

export function SaveHotelButton({ hotelId, className = "" }: SaveHotelButtonProps) {
    const [isSaved, setIsSaved] = useState(false);

    const refresh = useCallback(() => {
        setIsSaved(readSavedHotels().includes(hotelId));
    }, [hotelId]);

    useEffect(() => {
        refresh();
        window.addEventListener("saved_hotels_updated", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("saved_hotels_updated", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, [refresh]);

    const toggleSave = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const saved = readSavedHotels();
        const updated = saved.includes(hotelId)
            ? saved.filter((id) => id !== hotelId)
            : [...saved, hotelId];

        try {
            localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
        } catch {
            // Do not claim the hotel was saved if browser storage is unavailable.
            refresh();
            return;
        }
        window.dispatchEvent(new Event("saved_hotels_updated"));
    };

    return (
        <button
            type="button"
            onClick={toggleSave}
            aria-label={isSaved ? "Remove from saved hotels" : "Save hotel"}
            aria-pressed={isSaved}
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface text-ink shadow-md transition-all hover:scale-110 active:scale-95 ${className}`}
        >
            <svg
                className="h-4 w-4 transition-colors"
                viewBox="0 0 24 24"
                fill={isSaved ? "#ef4444" : "none"}
                stroke={isSaved ? "#ef4444" : "currentColor"}
                strokeWidth={2}
                aria-hidden="true"
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
