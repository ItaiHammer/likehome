"use client";

import { useEffect, useState } from "react";

import {
    AMENITY_OPTIONS,
    COLLAPSED_AMENITY_COUNT,
    GOOD_FOR_OPTIONS,
    MAX_PRICE,
    PROPERTY_TYPE_OPTIONS,
} from "../lib/searchConfig";
import type { GoodFor, PropertyType } from "../types";

type FilterModalProps = {
    open: boolean;
    onClose: () => void;

    minPrice: number;
    maxPrice: number;
    setMinPrice: (value: number) => void;
    setMaxPrice: (value: number) => void;

    minimumRating: number;
    setMinimumRating: (value: number) => void;

    selectedAmenities: string[];
    toggleAmenity: (amenity: string) => void;

    selectedPropertyTypes: PropertyType[];
    togglePropertyType: (propertyType: PropertyType) => void;

    minimumBeds: number;
    setMinimumBeds: (value: number) => void;

    connectingRoomsOnly: boolean;
    setConnectingRoomsOnly: (value: boolean) => void;

    selectedGoodFor: GoodFor[];
    toggleGoodFor: (category: GoodFor) => void;

    resultCount: number;
    onClear: () => void;
    onApply: () => void;
};

type FilterSection =
    | "price"
    | "rating"
    | "property"
    | "amenities"
    | "rooms"
    | "goodFor";

type FilterIconName = FilterSection;

function FilterIcon({ name }: { name: FilterIconName }) {
    const commonProps = {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        className: "h-5 w-5",
        "aria-hidden": true,
    };

    if (name === "price") {
        return (
            <svg {...commonProps}>
                <circle cx="12" cy="12" r="8" />
                <path d="M14.5 9.5c-.5-.7-1.3-1-2.4-1-1.4 0-2.4.7-2.4 1.7 0 2.7 5.2 1.2 5.2 4 0 1.1-1.1 1.9-2.7 1.9-1.2 0-2.2-.4-2.8-1.2" />
                <path d="M12 6.8v10.4" />
            </svg>
        );
    }

    if (name === "rating") {
        return (
            <svg {...commonProps}>
                <path d="m12 3 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3Z" />
            </svg>
        );
    }

    if (name === "property") {
        return (
            <svg {...commonProps}>
                <path d="M4 20V8l8-4 8 4v12" />
                <path d="M8 20v-6h8v6" />
                <path d="M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
        );
    }

    if (name === "amenities") {
        return (
            <svg {...commonProps}>
                <path d="M5 7h14M5 12h14M5 17h14" />
                <circle cx="8" cy="7" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="10" cy="17" r="1.5" fill="currentColor" stroke="none" />
            </svg>
        );
    }

    if (name === "rooms") {
        return (
            <svg {...commonProps}>
                <path d="M4 17v-6h16v6" />
                <path d="M6 11V8.5A2.5 2.5 0 0 1 8.5 6h2A2.5 2.5 0 0 1 13 8.5V11" />
                <path d="M4 17v2M20 17v2" />
            </svg>
        );
    }

    return (
        <svg {...commonProps}>
            <circle cx="9" cy="8" r="3" />
            <circle cx="17" cy="9" r="2" />
            <path d="M3.5 19c.5-3.4 2.4-5 5.5-5s5 1.6 5.5 5" />
            <path d="M14 15.2c.7-.8 1.7-1.2 3-1.2 2.3 0 3.8 1.2 4 3.8" />
        </svg>
    );
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

export default function FilterModal({
    open,
    onClose,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    minimumRating,
    setMinimumRating,
    selectedAmenities,
    toggleAmenity,
    selectedPropertyTypes,
    togglePropertyType,
    minimumBeds,
    setMinimumBeds,
    connectingRoomsOnly,
    setConnectingRoomsOnly,
    selectedGoodFor,
    toggleGoodFor,
    resultCount,
    onClear,
    onApply,
}: FilterModalProps) {
    const [openSection, setOpenSection] = useState<FilterSection | null>(null);
    const [showAllAmenities, setShowAllAmenities] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    const visibleAmenityOptions = showAllAmenities
        ? AMENITY_OPTIONS
        : AMENITY_OPTIONS.slice(0, COLLAPSED_AMENITY_COUNT);

    const minPricePercent = (minPrice / MAX_PRICE) * 100;
    const maxPricePercent = (maxPrice / MAX_PRICE) * 100;

    const toggleSection = (section: FilterSection) => {
        setOpenSection((current) => (current === section ? null : section));
    };

    const roomFilterCount = (minimumBeds > 0 ? 1 : 0) +
        (connectingRoomsOnly ? 1 : 0);

    /*
     * TODO(INTEGRATION): These controls currently update local frontend state.
     * When search becomes server-driven, send the selected filter values in the
     * agreed API request rather than filtering the mock listing array locally.
     *
     * TODO(DATABASE): Keep property types, amenities, and other selectable values
     * aligned with the final listing schema / IDs used by the backend.
     */

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#070D2F]/30 px-3 py-5 sm:px-4 sm:py-8"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="filters-title"
                className="flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-[#BACBDF] px-5 py-4 sm:px-6">
                    <div>
                        <h2
                            id="filters-title"
                            className="text-lg font-bold text-[#070D2F]"
                        >
                            Filters
                        </h2>
                        <p className="mt-0.5 text-sm text-[#536383]">
                            Open a category to narrow your stay.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close filters"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#536383] transition hover:bg-[#E7EEF8] hover:text-[#070D2F]"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                            className="h-5 w-5"
                        >
                            <path d="M6 6l12 12" />
                            <path d="M18 6 6 18" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto">
                    {/* Price */}
                    <section className="border-b border-[#BACBDF]">
                        <button
                            type="button"
                            onClick={() => toggleSection("price")}
                            aria-expanded={openSection === "price"}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#E7EEF8]/30 sm:px-6"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EEF8] text-[#4C79BD]">
                                <FilterIcon name="price" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#070D2F]">
                                    Price
                                </span>
                                <span className="block truncate text-sm text-[#536383]">
                                    {minPrice === 0 && maxPrice === MAX_PRICE
                                        ? "Any price"
                                        : `$${minPrice} – $${maxPrice}`}
                                </span>
                            </span>
                            <Chevron open={openSection === "price"} />
                        </button>

                        {openSection === "price" && (
                            <div className="bg-[#FAFBFC] px-5 pb-5 pt-1 sm:px-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <label>
                                        <span className="mb-1.5 block text-xs font-semibold text-[#536383]">
                                            Min price
                                        </span>
                                        <div className="rounded-[8px] border border-[#BACBDF] bg-white px-3 py-2.5 text-[#070D2F]">
                                            $
                                            <input
                                                type="number"
                                                min="0"
                                                max={maxPrice}
                                                step="10"
                                                value={minPrice}
                                                onChange={(event) =>
                                                    setMinPrice(
                                                        Math.min(
                                                            Math.max(
                                                                0,
                                                                Number(event.target.value),
                                                            ),
                                                            maxPrice,
                                                        ),
                                                    )
                                                }
                                                className="ml-1 w-[78%] bg-transparent outline-none"
                                            />
                                        </div>
                                    </label>

                                    <label>
                                        <span className="mb-1.5 block text-xs font-semibold text-[#536383]">
                                            Max price
                                        </span>
                                        <div className="rounded-[8px] border border-[#BACBDF] bg-white px-3 py-2.5 text-[#070D2F]">
                                            $
                                            <input
                                                type="number"
                                                min={minPrice}
                                                max={MAX_PRICE}
                                                step="10"
                                                value={maxPrice}
                                                onChange={(event) =>
                                                    setMaxPrice(
                                                        Math.max(
                                                            minPrice,
                                                            Math.min(
                                                                MAX_PRICE,
                                                                Number(event.target.value),
                                                            ),
                                                        ),
                                                    )
                                                }
                                                className="ml-1 w-[78%] bg-transparent outline-none"
                                            />
                                        </div>
                                    </label>
                                </div>

                                <div className="relative mt-5 h-7">
                                    <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#DCE6F2]" />
                                    <div
                                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#4C79BD]"
                                        style={{
                                            left: `${minPricePercent}%`,
                                            right: `${100 - maxPricePercent}%`,
                                        }}
                                    />

                                    <input
                                        type="range"
                                        min="0"
                                        max={MAX_PRICE}
                                        step="10"
                                        value={minPrice}
                                        onChange={(event) =>
                                            setMinPrice(
                                                Math.min(
                                                    Number(event.target.value),
                                                    maxPrice,
                                                ),
                                            )
                                        }
                                        aria-label="Minimum price"
                                        className="likehome-dual-range absolute inset-0 z-30 w-full"
                                    />

                                    <input
                                        type="range"
                                        min="0"
                                        max={MAX_PRICE}
                                        step="10"
                                        value={maxPrice}
                                        onChange={(event) =>
                                            setMaxPrice(
                                                Math.max(
                                                    Number(event.target.value),
                                                    minPrice,
                                                ),
                                            )
                                        }
                                        aria-label="Maximum price"
                                        className="likehome-dual-range absolute inset-0 z-20 w-full"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Rating */}
                    <section className="border-b border-[#BACBDF]">
                        <button
                            type="button"
                            onClick={() => toggleSection("rating")}
                            aria-expanded={openSection === "rating"}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#E7EEF8]/30 sm:px-6"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EEF8] text-[#4C79BD]">
                                <FilterIcon name="rating" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#070D2F]">
                                    Rating
                                </span>
                                <span className="block text-sm text-[#536383]">
                                    {minimumRating > 0
                                        ? `${minimumRating.toFixed(1)}+`
                                        : "Any rating"}
                                </span>
                            </span>
                            <Chevron open={openSection === "rating"} />
                        </button>

                        {openSection === "rating" && (
                            <div className="space-y-2 bg-[#FAFBFC] px-5 pb-5 pt-1 sm:px-6">
                                {[
                                    [0, "Any rating"],
                                    [4, "4.0+"],
                                    [4.5, "4.5+"],
                                    [4.8, "4.8+"],
                                ].map(([value, label]) => (
                                    <label
                                        key={label}
                                        className="flex cursor-pointer items-center gap-3 rounded-[8px] bg-white px-3 py-2.5 text-sm text-[#070D2F]"
                                    >
                                        <input
                                            type="radio"
                                            name="minimum-rating"
                                            checked={minimumRating === Number(value)}
                                            onChange={() =>
                                                setMinimumRating(Number(value))
                                            }
                                            className="h-4 w-4 accent-[#4C79BD]"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Property type */}
                    <section className="border-b border-[#BACBDF]">
                        <button
                            type="button"
                            onClick={() => toggleSection("property")}
                            aria-expanded={openSection === "property"}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#E7EEF8]/30 sm:px-6"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EEF8] text-[#4C79BD]">
                                <FilterIcon name="property" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#070D2F]">
                                    Property type
                                </span>
                                <span className="block text-sm text-[#536383]">
                                    {selectedPropertyTypes.length > 0
                                        ? `${selectedPropertyTypes.length} selected`
                                        : "Any property type"}
                                </span>
                            </span>
                            <Chevron open={openSection === "property"} />
                        </button>

                        {openSection === "property" && (
                            <div className="grid gap-2 bg-[#FAFBFC] px-5 pb-5 pt-1 sm:grid-cols-2 sm:px-6">
                                {PROPERTY_TYPE_OPTIONS.map((propertyType) => (
                                    <label
                                        key={propertyType}
                                        className="flex cursor-pointer items-center gap-3 rounded-[8px] bg-white px-3 py-2.5 text-sm text-[#070D2F]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedPropertyTypes.includes(
                                                propertyType,
                                            )}
                                            onChange={() =>
                                                togglePropertyType(propertyType)
                                            }
                                            className="h-4 w-4 rounded accent-[#4C79BD]"
                                        />
                                        <span>{propertyType}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Amenities */}
                    <section className="border-b border-[#BACBDF]">
                        <button
                            type="button"
                            onClick={() => toggleSection("amenities")}
                            aria-expanded={openSection === "amenities"}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#E7EEF8]/30 sm:px-6"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EEF8] text-[#4C79BD]">
                                <FilterIcon name="amenities" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#070D2F]">
                                    Amenities
                                </span>
                                <span className="block text-sm text-[#536383]">
                                    {selectedAmenities.length > 0
                                        ? `${selectedAmenities.length} selected`
                                        : "Choose the features you want"}
                                </span>
                            </span>
                            <Chevron open={openSection === "amenities"} />
                        </button>

                        {openSection === "amenities" && (
                            <div className="bg-[#FAFBFC] px-5 pb-5 pt-1 sm:px-6">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {visibleAmenityOptions.map((amenity) => (
                                        <label
                                            key={amenity}
                                            className="flex cursor-pointer items-center gap-3 rounded-[8px] bg-white px-3 py-2.5 text-sm text-[#070D2F]"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAmenities.includes(
                                                    amenity,
                                                )}
                                                onChange={() =>
                                                    toggleAmenity(amenity)
                                                }
                                                className="h-4 w-4 rounded accent-[#4C79BD]"
                                            />
                                            <span>{amenity}</span>
                                        </label>
                                    ))}
                                </div>

                                {AMENITY_OPTIONS.length >
                                    COLLAPSED_AMENITY_COUNT && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAllAmenities(
                                                (current) => !current,
                                            )
                                        }
                                        className="mt-3 text-sm font-semibold text-[#4C79BD] transition hover:text-[#3F69A7]"
                                    >
                                        {showAllAmenities
                                            ? "Show fewer amenities"
                                            : `Show all ${AMENITY_OPTIONS.length} amenities`}
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Beds & rooms */}
                    <section className="border-b border-[#BACBDF]">
                        <button
                            type="button"
                            onClick={() => toggleSection("rooms")}
                            aria-expanded={openSection === "rooms"}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#E7EEF8]/30 sm:px-6"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EEF8] text-[#4C79BD]">
                                <FilterIcon name="rooms" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#070D2F]">
                                    Beds & rooms
                                </span>
                                <span className="block text-sm text-[#536383]">
                                    {roomFilterCount > 0
                                        ? `${roomFilterCount} selected`
                                        : "Any room setup"}
                                </span>
                            </span>
                            <Chevron open={openSection === "rooms"} />
                        </button>

                        {openSection === "rooms" && (
                            <div className="bg-[#FAFBFC] px-5 pb-5 pt-1 sm:px-6">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#536383]">
                                    Minimum beds
                                </p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                        [0, "Any"],
                                        [1, "1+"],
                                        [2, "2+"],
                                        [3, "3+"],
                                    ].map(([value, label]) => (
                                        <label
                                            key={label}
                                            className="flex cursor-pointer items-center gap-2 rounded-[8px] bg-white px-3 py-2.5 text-sm text-[#070D2F]"
                                        >
                                            <input
                                                type="radio"
                                                name="minimum-beds"
                                                checked={minimumBeds === Number(value)}
                                                onChange={() =>
                                                    setMinimumBeds(Number(value))
                                                }
                                                className="h-4 w-4 accent-[#4C79BD]"
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>

                                <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-[8px] bg-white px-3 py-3 text-sm text-[#070D2F]">
                                    <input
                                        type="checkbox"
                                        checked={connectingRoomsOnly}
                                        onChange={(event) =>
                                            setConnectingRoomsOnly(
                                                event.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded accent-[#4C79BD]"
                                    />
                                    Connecting rooms
                                </label>
                            </div>
                        )}
                    </section>

                    {/* Good for */}
                    <section>
                        <button
                            type="button"
                            onClick={() => toggleSection("goodFor")}
                            aria-expanded={openSection === "goodFor"}
                            className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#E7EEF8]/30 sm:px-6"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EEF8] text-[#4C79BD]">
                                <FilterIcon name="goodFor" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-[#070D2F]">
                                    Good for
                                </span>
                                <span className="block text-sm text-[#536383]">
                                    {selectedGoodFor.length > 0
                                        ? `${selectedGoodFor.length} selected`
                                        : "Couples, families, or groups"}
                                </span>
                            </span>
                            <Chevron open={openSection === "goodFor"} />
                        </button>

                        {openSection === "goodFor" && (
                            <div className="grid gap-2 bg-[#FAFBFC] px-5 pb-5 pt-1 sm:grid-cols-3 sm:px-6">
                                {GOOD_FOR_OPTIONS.map((category) => (
                                    <label
                                        key={category}
                                        className="flex cursor-pointer items-center gap-3 rounded-[8px] bg-white px-3 py-2.5 text-sm text-[#070D2F]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedGoodFor.includes(
                                                category,
                                            )}
                                            onChange={() => toggleGoodFor(category)}
                                            className="h-4 w-4 rounded accent-[#4C79BD]"
                                        />
                                        <span>{category}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Always-visible actions while the filter categories scroll. */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#BACBDF] bg-white px-5 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => {
                            setOpenSection(null);
                            setShowAllAmenities(false);
                            onClear();
                        }}
                        className="rounded-[8px] px-3 py-2.5 text-sm font-semibold text-[#536383] transition hover:bg-[#E7EEF8]/45 hover:text-[#070D2F]"
                    >
                        Clear all
                    </button>

                    <button
                        type="button"
                        onClick={onApply}
                        className="rounded-[8px] bg-[#4C79BD] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3F69A7]"
                    >
                        Show {resultCount} {resultCount === 1 ? "result" : "results"}
                    </button>
                </div>
            </div>
        </div>
    );
}
