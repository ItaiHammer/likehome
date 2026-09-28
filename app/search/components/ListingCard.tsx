import Link from "next/link";

import { dmSerif } from "../lib/fonts";
import type { Listing } from "../types";

type ListingCardProps = {
    stay: Listing;
};

export default function ListingCard({ stay }: ListingCardProps) {
    const location = [stay.city, stay.region, stay.country]
        .filter(Boolean)
        .join(", ");

    const imageUrl = stay.imageUrls?.[0];

    /*
     * The numeric rating is already visible on the card, so avoid repeating
     * "Highly rated" as a highlight. Fill any open chip spots with other
     * useful amenities from the listing.
     */
    const usefulHighlights = Array.from(
        new Set([
            ...stay.highlights.filter(
                (highlight) => highlight.toLowerCase() !== "highly rated",
            ),
            ...stay.amenities,
        ]),
    ).slice(0, 3);

    return (
        <Link
            // TODO(ROUTE): The listing details page should read this ID and load
            // the corresponding listing from the backend/database.
            href={`/listings/${stay.id}`}
            className="@container block overflow-hidden rounded-[8px] border border-[#BACBDF] bg-white transition hover:border-[#4C79BD] hover:shadow-md"
        >
            {/* TODO(BACKEND): Replace the placeholder with API-provided photos. */}
            {/* TODO(ERROR): Add an image-load fallback once remote photos are used. */}
            <div
                className="h-48 bg-cover bg-center"
                style={{
                    backgroundImage: imageUrl
                        ? `url("${imageUrl}")`
                        : "linear-gradient(135deg, #AEC3DF, #D7E3F1)",
                }}
                role="img"
                aria-label={
                    imageUrl
                        ? `${stay.name} property`
                        : `${stay.name} image placeholder`
                }
            />

            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <h3 className={`${dmSerif.className} text-xl text-[#070D2F]`}>
                            {stay.name}
                        </h3>

                        <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#536383]">
                            {location}
                        </p>

                        <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
                            {usefulHighlights.map((highlight, index) => (
                                <span
                                    key={highlight}
                                    className={`shrink-0 whitespace-nowrap rounded-full border border-[#BACBDF] bg-[#FAFBFC] px-2 py-1 text-[11px] font-medium text-[#536383] ${
                                        index === 0
                                            ? "inline-flex"
                                            : index === 1
                                              ? "hidden @min-[240px]:inline-flex"
                                              : "hidden @min-[340px]:inline-flex"
                                    }`}
                                >
                                    {highlight}
                                </span>
                            ))}
                        </div>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-[#070D2F]">
                        ★ {stay.rating}
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#D7E3F1] pt-3 text-xs font-medium text-[#536383]">
                    <span className="inline-flex items-center gap-1.5">
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="8" r="3" />
                            <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
                        </svg>
                        Up to {stay.maxGuests} guests
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 18v-7" />
                            <path d="M21 18v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5" />
                            <path d="M3 15h18" />
                            <path d="M7 11V8a2 2 0 0 0-2-2H3v9" />
                        </svg>
                        {stay.beds} {stay.beds === 1 ? "bed" : "beds"}
                    </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-4 border-t border-[#D7E3F1] pt-3">
                    <span className="text-sm text-[#536383]">
                        {stay.propertyType}
                    </span>

                    <span className="text-right text-[#070D2F]">
                        <span className="text-lg font-bold">
                            ${stay.pricePerNight}
                        </span>
                        <span className="ml-1 text-xs font-medium text-[#536383]">
                            / night
                        </span>
                    </span>
                </div>
            </div>
        </Link>
    );
}
