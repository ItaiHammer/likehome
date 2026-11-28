"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { isHotelId, shownSaved } from "@/lib/saved-hotels";
import { toggleSavedHotel, useSaveFailure, useSavedHotels } from "./savedHotelsStore";
import { Toast } from "./Toast";

interface SaveHotelButtonProps {
    /** A hotels.id; sample stays and unsaved LiteAPI hotels have none and get no heart */
    hotelId: string;
    /** Named in the button's label, so each heart on a page says which hotel it saves */
    hotelName: string | null | undefined;
    /** Known saved state from the server render, shown until the store knows this hotel */
    saved?: boolean;
    className?: string;
}

// Whether the viewer can have hearts (travelers, and signed-out visitors who are sent to sign in), known
// from the server render so business and unchosen accounts never see one
const HeartsAllowed = createContext(true);

export function HeartsAccess({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
    return <HeartsAllowed.Provider value={allowed}>{children}</HeartsAllowed.Provider>;
}

export function SaveHotelButton({ hotelId, hotelName, saved, className = "" }: SaveHotelButtonProps) {
    const router = useRouter();
    const allowed = useContext(HeartsAllowed);
    const hearts = useSavedHotels();
    const { status } = hearts;
    const [pending, setPending] = useState(false);
    const isSaved = shownSaved(hearts, hotelId, saved);
    const name = hotelName?.trim() || "this hotel";
    // The label stays put and aria-pressed says whether it's saved, as toggle buttons should
    const label = status === "signed-out" ? `Sign in to save ${name}` : `Save ${name}`;

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
        const result = await toggleSavedHotel(hotelId, isSaved);
        setPending(false);
        if (result === "signed-out") signIn();
        else if (result === "saved" || result === "removed") router.refresh();
    };

    // Only personal accounts save hotels
    if (!allowed || !isHotelId(hotelId) || status === "unavailable") return null;

    return (
        <button
            type="button"
            onClick={toggleSave}
            aria-label={label}
            aria-pressed={isSaved}
            aria-busy={pending || undefined}
            className={`group/heart block rounded-full focus-visible:outline-none ${className}`}
        >
            {/* The ::before is a 44px tap area around the 32px circle that takes no room in the layout */}
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface text-ink shadow-md transition-transform before:absolute before:-inset-1.5 before:rounded-full group-hover/heart:scale-110 group-focus-visible/heart:ring-2 group-focus-visible/heart:ring-blue group-active/heart:scale-95">
                {pending ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-blue motion-reduce:animate-none" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                ) : (
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
                )}
            </span>
        </button>
    );
}

// One per page, outside the cards: a card whose heart is cleared can leave the page before its save fails
export function SaveFailureAnnouncer() {
    const failure = useSaveFailure();
    const [dismissed, setDismissed] = useState<number | null>(null);
    const shown = failure && failure.n !== dismissed ? failure : null;
    return (
        <Toast
            messageKey={shown?.n}
            toast={shown ? { title: shown.message, tone: "error" } : null}
            onDismiss={() => setDismissed(failure?.n ?? null)}
        />
    );
}
