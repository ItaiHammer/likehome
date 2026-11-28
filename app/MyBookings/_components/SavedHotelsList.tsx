"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/app/_components/ui";
import { useSavedHotels } from "@/app/_components/savedHotelsStore";
import { useAccountChanged } from "@/app/_components/useAccountChanged";
import { SearchResultCard } from "@/app/search/components/SearchResultCard";

export interface SavedHotel {
    id: string;
    name: string;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    photoUrl?: string | null;
    pricePerNight?: number | null;
    tags?: string[] | null;
    description?: string | null;
    maxCapacity?: number | null;
    roomOptions?: number | null;
}

function ListNotice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
    return (
        <Card className="sm:p-8">
            <p className="text-lg font-semibold text-ink">{title}</p>
            <p className="mt-1 text-slate">{body}</p>
            {children}
        </Card>
    );
}

type SortChoice = "recent" | "name_asc" | "name_desc";

const SORT_CHOICES: { value: SortChoice; label: string }[] = [
    { value: "recent", label: "Recently saved" },
    { value: "name_asc", label: "Name: A to Z" },
    { value: "name_desc", label: "Name: Z to A" },
];

// Same menu treatment as the search-results SortSelect. Sorting remains local
// to the saved-hotel list; it must not navigate away or reset the favorites store.
function SavedSortMenu({ value, onChange }: { value: SortChoice; onChange: (value: SortChoice) => void }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const selected = SORT_CHOICES.find((option) => option.value === value) ?? SORT_CHOICES[0];

    useEffect(() => {
        if (!open) return;
        const closeOutside = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
            }
        };
        document.addEventListener("pointerdown", closeOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative shrink-0" onBlur={(event) => {
            if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) setOpen(false);
        }}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={`Sort saved hotels: ${selected.label}`}
                aria-expanded={open}
                aria-controls="saved-hotels-sort-options"
                onClick={() => setOpen((previous) => !previous)}
                className="inline-flex min-w-[12rem] items-center justify-between gap-3 rounded-xl border border-edge bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-blue/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            >
                <span><span className="mr-1 font-medium text-slate">Sort:</span>{selected.label}</span>
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div id="saved-hotels-sort-options" className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-edge bg-surface p-2 shadow-[0_20px_50px_-15px_rgba(10,20,50,0.45)]">
                    {SORT_CHOICES.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={value === option.value}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                                triggerRef.current?.focus({ preventScroll: true });
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${value === option.value ? "bg-blue/10 font-semibold text-blue-dark" : "text-ink hover:bg-blue/5"}`}
                        >
                            {option.label}
                            {value === option.value && <span aria-hidden="true">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// `hotels` is the account's saved list from the server, newest first. A heart cleared on this page hides its card;
// the store's list can be older than the server's, so it hides nothing else.
export function SavedHotelsList({ hotels }: { hotels: SavedHotel[] }) {
    const [sortBy, setSortBy] = useState<SortChoice>("recent");
    const saved = useSavedHotels();
    const accountChanged = useAccountChanged();

    if (accountChanged) {
        return (
            <ListNotice
                title="You signed out or switched accounts"
                body="Reload the page to see saved hotels for the account signed in now."
            />
        );
    }

    const kept = hotels.filter((h) => !(saved.known.has(h.id) && !saved.ids.has(h.id)));

    const savedHotels = [...kept].sort((a, b) => {
        if (sortBy === "name_asc") {
            return a.name.localeCompare(b.name);
        }
        if (sortBy === "name_desc") {
            return b.name.localeCompare(a.name);
        }
        return hotels.indexOf(a) - hotels.indexOf(b);
    });

    if (savedHotels.length === 0) {
        return (
            <ListNotice title="No saved hotels yet" body="Click the heart icon on any hotel card to save it here.">
                <Button href="/search" className="mt-5">
                    Explore stays
                </Button>
            </ListNotice>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
                <p className="text-sm text-slate" aria-live="polite">
                    <span className="font-semibold tabular-nums text-ink">{savedHotels.length}</span> {savedHotels.length === 1 ? "hotel saved" : "hotels saved"}
                </p>
                <SavedSortMenu value={sortBy} onChange={setSortBy} />
            </div>
            <ul className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
                {savedHotels.map((hotel) => (
                    <li key={hotel.id} className="min-w-0 [&>article]:h-full">
                        <SearchResultCard
                            stay={{
                                id: hotel.id,
                                name: hotel.name,
                                city: hotel.city,
                                region: hotel.region,
                                country: hotel.country,
                                photo_urls: hotel.photoUrl ? [hotel.photoUrl] : [],
                                min_price: hotel.pricePerNight,
                                price_status: hotel.pricePerNight == null ? "needs-dates" : undefined,
                                tags: hotel.tags,
                                description: hotel.description,
                                max_capacity: hotel.maxCapacity,
                                room_options: hotel.roomOptions,
                            }}
                            headingLevel="h3"
                            initiallySaved
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}
