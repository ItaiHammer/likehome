"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/ui";
import { SaveHotelButton } from "@/app/_components/SaveHotelButton";
import { STAYS } from "@/app/_data/stays";

interface Hotel {
    id: string;
    name: string;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    photoUrl?: string | null;
    pricePerNight?: number | null;
    tags?: string[] | null;
}

export function SavedHotelsList({ allHotels }: { allHotels: Hotel[] }) {
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [sortBy, setSortBy] = useState<"recent" | "name_asc" | "name_desc">("recent");

    const loadSaved = () => {
        const saved = JSON.parse(localStorage.getItem("likehome_saved_hotels") || "[]");
        setSavedIds(saved);
        setIsLoaded(true);
    };

    useEffect(() => {
        loadSaved();
        window.addEventListener("saved_hotels_updated", loadSaved);
        return () => window.removeEventListener("saved_hotels_updated", loadSaved);
    }, []);

    if (!isLoaded) {
        return <p className="text-sm text-slate">Loading saved hotels...</p>;
    }

    const savedHotelsRaw = savedIds
        .map((id): Hotel | null => {
            const strId = String(id);

            let staticStay = STAYS.find(
                (stay) => stay.slug === strId
            );
            const dbHotel = allHotels.find((h) => String(h.id) === strId);

            if (!staticStay && dbHotel) {
                const cleanDbName = dbHotel.name.toLowerCase().trim();
                staticStay = STAYS.find((s) => {
                    const cleanStayName = s.name.toLowerCase().trim();
                    return cleanDbName.includes(cleanStayName) || cleanStayName.includes(cleanDbName);
                });
            }

            const matchedDbHotel =
                dbHotel ||
                (staticStay
                    ? allHotels.find((h) => {
                        const cleanDbName = h.name.toLowerCase().trim();
                        const cleanStayName = staticStay.name.toLowerCase().trim();
                        return cleanDbName.includes(cleanStayName) || cleanStayName.includes(cleanDbName);
                    })
                    : null);

            const name = staticStay?.name || matchedDbHotel?.name;
            if (!name) return null;

            return {
                id: strId,
                name,
                city: staticStay?.location ?? matchedDbHotel?.city ?? null,
                region: matchedDbHotel?.region ?? null,
                country: matchedDbHotel?.country ?? null,
                photoUrl:
                    staticStay?.photos?.[0] ??
                    matchedDbHotel?.photoUrl ??
                    null,
                pricePerNight:
                    matchedDbHotel?.pricePerNight ??
                    (staticStay
                        ? Math.min(...staticStay.rooms.map((room) => room.nightly))
                        : null),
                tags: staticStay?.tags || matchedDbHotel?.tags || null,
            };
        })
        .filter((h): h is Hotel => h !== null);

    const savedHotels = [...savedHotelsRaw].sort((a, b) => {
        if (sortBy === "name_asc") {
            return a.name.localeCompare(b.name);
        }
        if (sortBy === "name_desc") {
            return b.name.localeCompare(a.name);
        }
        return savedIds.indexOf(a.id) - savedIds.indexOf(b.id);
    });

    if (savedHotels.length === 0) {
        return (
            <div className="rounded-lg border border-edge bg-surface p-6 sm:p-8">
                <p className="text-lg font-semibold text-ink">No saved hotels yet</p>
                <p className="mt-1 text-slate">Click the heart icon on any hotel card to save it here.</p>
                <Button href="/search" className="mt-5">
                    Explore stays
                </Button>
            </div>
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

                                <SaveHotelButton hotelId={hotel.id} className="absolute top-3 right-3 z-10" />
                            </div>

                            {/* Card Details */}
                            <div className="flex flex-1 flex-col p-4 space-y-2">
                                <div>
                                    <h3 className="font-semibold text-ink text-sm truncate">{hotel.name}</h3>
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