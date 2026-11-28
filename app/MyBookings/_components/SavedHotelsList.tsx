"use client";

import { stayDisplayName } from "@/app/_components/stayDisplayName";
import { useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/app/_components/ui";
import { SaveHotelButton } from "@/app/_components/SaveHotelButton";
import { useSavedHotels } from "@/app/_components/savedHotelsStore";
import { useAccountChanged } from "@/app/_components/useAccountChanged";

export interface SavedHotel {
    id: string;
    name: string;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    photoUrl?: string | null;
    pricePerNight?: number | null;
    tags?: string[] | null;
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

// `hotels` is the account's saved list from the server, newest first. A heart cleared on this page hides its card;
// the store's list can be older than the server's, so it hides nothing else.
export function SavedHotelsList({ hotels }: { hotels: SavedHotel[] }) {
    const [sortBy, setSortBy] = useState<"recent" | "name_asc" | "name_desc">("recent");
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
        <div className="space-y-4">
            {/* Top Bar: Saved Count + Alphabetical Sorting Dropdown */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate">
                    {savedHotels.length} {savedHotels.length === 1 ? "saved hotel" : "saved hotels"}
                </p>

                <div className="relative inline-block text-left">
                    <select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(e.target.value as typeof sortBy)
                        }
                        className="appearance-none rounded-control border border-edge bg-surface px-3 py-1.5 pr-8 text-xs font-medium text-slate shadow-sm transition-colors hover:border-slate/40 focus:outline-none cursor-pointer"
                    >
                        <option value="recent">Recently saved</option>
                        <option value="name_asc">Name: A to Z</option>
                        <option value="name_desc">Name: Z to A</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate">
            ▼
          </span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-6">
                {savedHotels.map((hotel) => {
                    const locationText = [hotel.city, hotel.region || hotel.country].filter(Boolean).join(", ");
                    const tag1 = hotel.tags?.[0] || "Parking";
                    const tag2 = hotel.tags?.[1] || "Free Wi-Fi";

                    return (
                        <div
                            key={hotel.id}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-edge bg-surface shadow-sm transition-all hover:shadow-md"
                        >
                            {/* Photo Container */}
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper">
                                {hotel.photoUrl ? (
                                    <img
                                        src={hotel.photoUrl}
                                        alt={hotel.name}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-paper text-slate text-xs">
                                        No image available
                                    </div>
                                )}

                                <SaveHotelButton hotelId={hotel.id} hotelName={hotel.name} saved className="absolute top-3 right-3 z-10" />
                            </div>

                            {/* Card Details */}
                            <div className="flex flex-1 flex-col p-4 space-y-2">
                                <div>
                                    <h3 className="font-semibold text-ink text-sm truncate">{stayDisplayName(hotel.name)}</h3>
                                    {locationText && <p className="text-xs text-slate mt-0.5 truncate">{locationText}</p>}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate pt-1">
                                    <span>{tag1}</span>
                                    <span>{tag2}</span>
                                </div>

                                <div className="mt-auto pt-3 border-t border-edge flex items-center justify-between">
                                    <div>
                                        {hotel.pricePerNight ? (
                                            <>
                                                <span className="font-bold text-ink text-sm">${hotel.pricePerNight}</span>
                                                <span className="text-xs text-slate"> / night</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate italic">Contact for pricing</span>
                                        )}
                                    </div>

                                    <Link
                                        href={`/reserve/${hotel.id}`}
                                        className="text-xs font-semibold text-blue-dark hover:underline flex items-center gap-1"
                                    >
                                        View stay &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}