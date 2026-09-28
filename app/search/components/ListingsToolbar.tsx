"use client";

import { useState } from "react";

import { inter } from "../lib/fonts";
import { SORT_OPTIONS, type SortOption } from "../lib/searchConfig";

type ListingsToolbarProps = {
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
};

export default function ListingsToolbar({
    sortOption,
    onSortChange,
}: ListingsToolbarProps) {
    const [sortOpen, setSortOpen] = useState(false);

    const currentSort =
        SORT_OPTIONS.find((option) => option.value === sortOption) ??
        SORT_OPTIONS[0];

    return (
        <div className={`${inter.className} flex items-center`}>
            {/*
             * Filters intentionally do not live in the results toolbar anymore.
             * They are available from the primary search bar before and after a
             * search. Sorting stays here because it only changes result order.
             */}
            <div className="relative">
                <button
                    type="button"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((current) => !current)}
                    className="flex items-center gap-2 rounded-[8px] border border-[#BACBDF] bg-white px-4 py-2.5 text-sm text-[#536383] transition hover:border-[#4C79BD]"
                >
                    <span>Sort by:</span>
                    <span className="font-semibold text-[#070D2F]">
                        {currentSort.label}
                    </span>
                    <span
                        aria-hidden="true"
                        className={`ml-1 text-xs transition ${
                            sortOpen ? "rotate-180" : ""
                        }`}
                    >
                        ▼
                    </span>
                </button>

                {sortOpen && (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-56 overflow-hidden rounded-[10px] border border-[#BACBDF] bg-white shadow-lg">
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onSortChange(option.value);
                                    setSortOpen(false);
                                }}
                                className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-[#E7EEF8]/45 ${
                                    sortOption === option.value
                                        ? "font-semibold text-[#4C79BD]"
                                        : "text-[#070D2F]"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
