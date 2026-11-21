"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { isHotelId } from "@/lib/saved-hotels";
import { toggleSavedHotel, useSaveFailure, useSavedHotels } from "./savedHotelsStore";

interface SaveHotelButtonProps {
    /** A hotels.id; sample stays and unsaved LiteAPI hotels have none and get no heart */
    hotelId: string;
    className?: string;
}

export function SaveHotelButton({ hotelId, className = "" }: SaveHotelButtonProps) {
    const router = useRouter();
    const { status, ids } = useSavedHotels();
    const [pending, setPending] = useState(false);
    const isSaved = ids.has(hotelId);

    const signIn = () => {
        const back = `${window.location.pathname}${window.location.search}`;
        router.push(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(back)}`);
    };

    const toggleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        if (status === "signed-out") return signIn();

        setPending(true);
        const result = await toggleSavedHotel(hotelId);
        setPending(false);
        if (result === "signed-out") signIn();
    };

    if (!isHotelId(hotelId)) return null;

    return (
        <button
            type="button"
            onClick={toggleSave}
            aria-label={status === "signed-out" ? "Sign in to save this hotel" : "Save hotel"}
            aria-pressed={isSaved}
            aria-busy={pending || undefined}
            className={`group/heart block rounded-full focus-visible:outline-none ${className}`}
        >
            {/* The ::before is a 44px tap area around the 32px circle that takes no room in the layout */}
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface text-ink shadow-md transition-transform before:absolute before:-inset-1.5 before:rounded-full group-hover/heart:scale-110 group-focus-visible/heart:ring-2 group-focus-visible/heart:ring-blue group-active/heart:scale-95">
                <svg
                    aria-hidden
                    className={`h-4 w-4 transition-colors ${isSaved ? "text-danger" : ""}`}
                    viewBox="0 0 24 24"
                    fill={isSaved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
            </span>
        </button>
    );
}

// One per page, outside the cards: a card whose heart is cleared can leave the page before its save fails
export function SaveFailureAnnouncer() {
    const failure = useSaveFailure();
    return (
        <span role="status" className="sr-only">
            {failure && <span key={failure.n}>{failure.message}</span>}
        </span>
    );
}
