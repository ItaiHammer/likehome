"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
    DM_Serif_Display,
    Inter,
} from "next/font/google";

import {
    DayPicker,
    type DateRange,
} from "react-day-picker";

import { format } from "date-fns";

import PaintedBackground from "./PaintedBackground";

import {
    mockListings,
    popularDestinations,
    type DestinationScope,
    type Listing,
    type PopularDestination,
    type GoodFor,
} from "./mockListings";

const dmSerif = DM_Serif_Display({
    weight: "400",
    subsets: ["latin"],
});

const inter = Inter({
    subsets: ["latin"],
});

const RESULTS_PER_PAGE = 21;
const MAX_PRICE = 1000;

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

type SortOption =
    | "recommended"
    | "price-low"
    | "price-high"
    | "rating";

const sortOptions: {
    value: SortOption;
    label: string;
}[] = [
    {
        value: "recommended",
        label: "Recommended",
    },
    {
        value: "price-low",
        label: "Price: Low to high",
    },
    {
        value: "price-high",
        label: "Price: High to low",
    },
    {
        value: "rating",
        label: "Highest rated",
    },
];

const amenityOptions = [
    "WiFi",
    "Pool",
    "Hot tub",
    "Full kitchen",
    "Kitchenette",
    "Free breakfast",
    "Free parking",
    "Beach access",
    "Gym",
    "Spa",
    "Breakfast available",
    "Parking available",
    "Ocean view",
    "Mountain view",
    "City view",
    "Pet-friendly",
    "Air conditioning",
    "Washer / dryer",
    "Airport shuttle",
    "EV charging",
    "Casino",
];

const COLLAPSED_AMENITY_COUNT = 10;

const propertyTypeOptions = [
    "Hotel",
    "Resort",
    "Motel",
    "Bed & Breakfast",
    "Apartment",
    "Condo",
    "Vacation home",
    "Villa",
    "Townhome",
    "Cabin / Cottage",
] as const;

const goodForOptions: GoodFor[] = [
    "Couples",
    "Families",
    "Groups",
];

function listingHasAmenity(
    stay: Listing,
    amenity: string,
) {
    if (amenity === "Breakfast available") {
        return (
            stay.amenities.includes(
                "Breakfast available",
            ) ||
            stay.amenities.includes(
                "Free breakfast",
            )
        );
    }

    if (amenity === "Parking available") {
        return (
            stay.amenities.includes(
                "Parking available",
            ) ||
            stay.amenities.includes(
                "Free parking",
            )
        );
    }

    return stay.amenities.includes(
        amenity,
    );
}

/*
 * Temporary autocomplete source.
 *
 * Later, this should come from the backend/API
 * instead of mock data.
 */
const destinationSuggestions = Array.from(
    new Set(
        [
            ...mockListings.flatMap(
                (stay) => [
                    stay.city,
                    stay.region,
                    stay.country,
                ],
            ),

            ...popularDestinations.flatMap(
                (place) => [
                    place.name,
                    place.searchValue,
                ],
            ),
        ].filter(
            (value): value is string =>
                Boolean(value),
        ),
    ),
).sort((a, b) =>
    a.localeCompare(b),
);

/*
 * Temporary backgrounds until the backend/API
 * supplies real image URLs.
 */
const destinationBackgrounds = [
    "linear-gradient(140deg, #4F78C1 0%, #829FCE 48%, #AEC3DF 100%)",
    "linear-gradient(145deg, #829FCE 0%, #4C79BD 52%, #AEC3DF 100%)",
    "linear-gradient(130deg, #AEC3DF 0%, #739CD2 48%, #4F78C1 100%)",
    "linear-gradient(155deg, #4C79BD 0%, #AEC3DF 52%, #829FCE 100%)",
    "linear-gradient(125deg, #739CD2 0%, #4F78C1 52%, #AEC3DF 100%)",
];

/*
 * Desktop collage:
 *
 * #1 biggest on left
 * #2 and #5 bigger
 * #3 and #4 smaller
 * #5 bottom-right
 */
const desktopDestinationLayouts = [
    "col-start-1 col-span-2 row-start-1 row-span-2",
    "col-start-3 col-span-2 row-start-1",
    "col-start-3 col-span-1 row-start-2",
    "col-start-5 col-span-1 row-start-1",
    "col-start-4 col-span-2 row-start-2",
];

function LikeHomeLogo() {
    const [
        logoLoaded,
        setLogoLoaded,
    ] = useState(false);

    return (
        <span className="relative flex h-8 min-w-[115px] items-center">
            {!logoLoaded && (
                <span
                    className={`${dmSerif.className} text-2xl text-[#070D2F]`}
                >
                    LikeHome
                </span>
            )}

            <Image
                src="/likehome-logo.png"
                alt="LikeHome"
                width={160}
                height={48}
                priority
                onLoad={() =>
                    setLogoLoaded(true)
                }
                onError={() =>
                    setLogoLoaded(false)
                }
                className={`absolute left-0 h-8 w-auto object-contain ${
                    logoLoaded
                        ? "opacity-100"
                        : "opacity-0"
                }`}
            />
        </span>
    );
}

function ListingCard({
                         stay,
                     }: {
    stay: Listing;
}) {
    const location = [
        stay.city,
        stay.region,
        stay.country,
    ]
        .filter(Boolean)
        .join(", ");

    const imageUrl =
        stay.imageUrls?.[0];

    return (
        <Link
            href={`/listings/${stay.id}`}
            className="@container block overflow-hidden rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] transition hover:border-[#4C79BD] hover:shadow-md"
        >
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
                        <h3
                            className={`${dmSerif.className} text-xl text-[#070D2F]`}
                        >
                            {stay.name}
                        </h3>

                        <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#536383]">
                            {location}
                        </p>

                        <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
                            {stay.highlights
                                .slice(0, 3)
                                .map((highlight, index) => (
                                    <span
                                        key={highlight}
                                        className={`shrink-0 whitespace-nowrap rounded-full border border-[#BACBDF] bg-white px-2 py-1 text-[11px] font-medium text-[#536383] ${
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

                    <span className="text-sm font-semibold text-[#070D2F]">
                        ★ {stay.rating}
                    </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#BACBDF] pt-3">
                    <span className="text-sm text-[#536383]">
                        {stay.propertyType}
                    </span>

                    <span className="text-sm font-semibold text-[#070D2F]">
                        ${stay.pricePerNight} / night
                    </span>
                </div>
            </div>
        </Link>
    );
}

function DestinationCard({
                             place,
                             rank,
                             className = "",
                             onClick,
                         }: {
    place: PopularDestination;
    rank: number;
    className?: string;
    onClick: () => void;
}) {
    const fallback =
        destinationBackgrounds[
        (rank - 1) %
        destinationBackgrounds.length
            ];

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`View stays in ${place.name}`}
            className={`group relative overflow-hidden rounded-[10px] bg-cover bg-center text-left ${className}`}
            style={{
                backgroundImage:
                    place.imageUrl
                        ? `url("${place.imageUrl}")`
                        : fallback,
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D2F]/75 via-[#070D2F]/10 to-transparent transition group-hover:from-[#070D2F]/85" />

            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                    #{rank}
                </span>

                <span
                    className={`${dmSerif.className} block text-xl text-white sm:text-2xl`}
                >
                    {place.name}
                </span>
            </div>
        </button>
    );
}

function ListingsToolbar({
                             activeFilterCount,
                             sortOption,
                             sortOpen,
                             onOpenFilters,
                             onToggleSort,
                             onSortChange,
                         }: {
    activeFilterCount: number;
    sortOption: SortOption;
    sortOpen: boolean;
    onOpenFilters: () => void;
    onToggleSort: () => void;
    onSortChange: (
        option: SortOption,
    ) => void;
}) {
    const currentSort =
        sortOptions.find(
            (option) =>
                option.value === sortOption,
        ) ?? sortOptions[0];

    return (
        <div
            className={`${inter.className} flex flex-wrap items-center gap-2`}
        >
            <button
                type="button"
                onClick={onOpenFilters}
                className="flex items-center gap-2 rounded-[6px] border border-[#BACBDF] bg-white px-4 py-2.5 text-sm font-semibold text-[#070D2F] transition hover:border-[#4C79BD]"
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                >
                    <path d="M4 7h16" />
                    <path d="M7 12h10" />
                    <path d="M10 17h4" />
                </svg>

                Filters

                {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4C79BD] px-1.5 text-[11px] text-white">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            <div className="relative">
                <button
                    type="button"
                    onClick={onToggleSort}
                    className={`${inter.className} flex items-center gap-2 rounded-[6px] border border-[#BACBDF] bg-white px-4 py-2.5 text-sm text-[#536383] transition hover:border-[#4C79BD]`}
                >
                    <span>
                        Sort by:
                    </span>

                    <span className="font-semibold text-[#070D2F]">
                        {currentSort.label}
                    </span>

                    <span
                        className={`ml-1 text-xs transition ${
                            sortOpen
                                ? "rotate-180"
                                : ""
                        }`}
                    >
                        ▼
                    </span>
                </button>

                {sortOpen && (
                    <div
                        className={`${inter.className} absolute right-0 top-[calc(100%+6px)] z-30 min-w-56 overflow-hidden rounded-[8px] border border-[#BACBDF] bg-white shadow-lg`}
                    >
                        {sortOptions.map(
                            (option) => (
                                <button
                                    key={
                                        option.value
                                    }
                                    type="button"
                                    onClick={() =>
                                        onSortChange(
                                            option.value,
                                        )
                                    }
                                    className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-[#FAFBFC] ${
                                        sortOption ===
                                        option.value
                                            ? "font-semibold text-[#4C79BD]"
                                            : "text-[#070D2F]"
                                    }`}
                                >
                                    {
                                        option.label
                                    }
                                </button>
                            ),
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Pagination({
                        currentPage,
                        totalPages,
                        onPageChange,
                    }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (
        page: number,
    ) => void;
}) {
    return (
        <nav
            aria-label="Listing pages"
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
        >
            <button
                type="button"
                onClick={() =>
                    onPageChange(
                        currentPage - 1,
                    )
                }
                disabled={
                    currentPage === 1
                }
                className="rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] px-4 py-2 text-sm font-semibold text-[#536383] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Previous
            </button>

            {Array.from(
                {
                    length: totalPages,
                },
                (_, index) => {
                    const page =
                        index + 1;

                    return (
                        <button
                            key={page}
                            type="button"
                            onClick={() =>
                                onPageChange(
                                    page,
                                )
                            }
                            aria-current={
                                currentPage ===
                                page
                                    ? "page"
                                    : undefined
                            }
                            className={`min-w-10 rounded-[6px] border border-[#BACBDF] px-3 py-2 text-sm font-semibold ${
                                currentPage ===
                                page
                                    ? "bg-[#4C79BD] text-white"
                                    : "bg-[#FAFBFC] text-[#536383]"
                            }`}
                        >
                            {page}
                        </button>
                    );
                },
            )}

            <button
                type="button"
                onClick={() =>
                    onPageChange(
                        currentPage + 1,
                    )
                }
                disabled={
                    currentPage ===
                    totalPages
                }
                className="rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] px-4 py-2 text-sm font-semibold text-[#536383] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Next
            </button>
        </nav>
    );
}

export default function SearchPage() {
    const [
        destination,
        setDestination,
    ] = useState("");

    const [
        searchedDestination,
        setSearchedDestination,
    ] = useState("");

    const [
        hasSearched,
        setHasSearched,
    ] = useState(false);

    const [
        destinationScope,
        setDestinationScope,
    ] =
        useState<DestinationScope>(
            "nearby",
        );

    const [
        showAllPopular,
        setShowAllPopular,
    ] = useState(false);

    const [
        currentPage,
        setCurrentPage,
    ] = useState(1);

    const [
        filtersOpen,
        setFiltersOpen,
    ] = useState(false);

    const [
        sortOpen,
        setSortOpen,
    ] = useState(false);

    const [
        sortOption,
        setSortOption,
    ] =
        useState<SortOption>(
            "recommended",
        );

    const [
        datePickerOpen,
        setDatePickerOpen,
    ] = useState(false);

    const [
        monthYearPickerOpen,
        setMonthYearPickerOpen,
    ] = useState(false);

    const [
        calendarMonth,
        setCalendarMonth,
    ] = useState(new Date());

    const [
        selectedDates,
        setSelectedDates,
    ] =
        useState<DateRange | undefined>();

    const [
        minPrice,
        setMinPrice,
    ] = useState(0);

    const [
        maxPrice,
        setMaxPrice,
    ] = useState(MAX_PRICE);

    const [
        minimumRating,
        setMinimumRating,
    ] = useState(0);

    const [
        selectedAmenities,
        setSelectedAmenities,
    ] = useState<string[]>([]);

    const [
        selectedPropertyTypes,
        setSelectedPropertyTypes,
    ] = useState<string[]>([]);

    const [
        minimumBeds,
        setMinimumBeds,
    ] = useState(0);

    const [
        connectingRoomsOnly,
        setConnectingRoomsOnly,
    ] = useState(false);

    const [
        selectedGoodFor,
        setSelectedGoodFor,
    ] = useState<GoodFor[]>([]);

    const [
        showAllAmenities,
        setShowAllAmenities,
    ] = useState(false);

    const [
        guests,
        setGuests,
    ] = useState("");

    const [
        guestError,
        setGuestError,
    ] = useState("");

    const [
        destinationError,
        setDestinationError,
    ] = useState("");

    const [
        dateError,
        setDateError,
    ] = useState("");

    const [
        accountMenuOpen,
        setAccountMenuOpen,
    ] = useState(false);

    const [
        mobileMenuOpen,
        setMobileMenuOpen,
    ] = useState(false);

    const [
        destinationFocused,
        setDestinationFocused,
    ] = useState(false);

    const visibleDestinations =
        popularDestinations
            .filter(
                (place) =>
                    place.scope ===
                    destinationScope,
            )
            .slice(0, 5);

    const visibleAmenityOptions =
        showAllAmenities
            ? amenityOptions
            : amenityOptions.slice(
                0,
                COLLAPSED_AMENITY_COUNT,
            );

    const normalizedDestination =
        searchedDestination
            .trim()
            .toLowerCase();

    const destinationListings =
        mockListings.filter((stay) => {
            if (
                !normalizedDestination
            ) {
                return true;
            }

            return (
                stay.city
                    .toLowerCase()
                    .includes(
                        normalizedDestination,
                    ) ||
                (stay.region
                        ?.toLowerCase()
                        .includes(
                            normalizedDestination,
                        ) ??
                    false) ||
                stay.country
                    .toLowerCase()
                    .includes(
                        normalizedDestination,
                    )
            );
        });

    const popularListings =
        mockListings.filter((stay) =>
            visibleDestinations.some(
                (place) => {
                    const searchValue =
                        place.searchValue.toLowerCase();

                    return (
                        stay.city
                            .toLowerCase()
                            .includes(
                                searchValue,
                            ) ||
                        (stay.region
                                ?.toLowerCase()
                                .includes(
                                    searchValue,
                                ) ??
                            false) ||
                        stay.country
                            .toLowerCase()
                            .includes(
                                searchValue,
                            )
                    );
                },
            ),
        );

    /*
     * Search results use the searched destination.
     *
     * Browsing/View all uses listings from the
     * selected Popular Destinations category.
     */
    const baseListings =
        hasSearched
            ? destinationListings
            : popularListings;

    const filteredListings =
        baseListings.filter((stay) => {
            const matchesPrice =
                stay.pricePerNight >=
                minPrice &&
                stay.pricePerNight <=
                maxPrice;

            const matchesRating =
                stay.rating >=
                minimumRating;

            const matchesPropertyType =
                selectedPropertyTypes.length ===
                0 ||
                selectedPropertyTypes.includes(
                    stay.propertyType,
                );

            const matchesAmenities =
                selectedAmenities.every(
                    (amenity) =>
                        listingHasAmenity(
                            stay,
                            amenity,
                        ),
                );

            const matchesBeds =
                minimumBeds === 0 ||
                stay.beds >=
                minimumBeds;

            const matchesConnectingRooms =
                !connectingRoomsOnly ||
                stay.connectingRooms;

            const matchesGoodFor =
                selectedGoodFor.every(
                    (category) =>
                        stay.goodFor.includes(
                            category,
                        ),
                );

            /*
             * Guest capacity only matters after
             * the user performs a normal search.
             */
            const matchesGuests =
                !hasSearched ||
                guests === "" ||
                stay.maxGuests >=
                Number(guests);

            return (
                matchesPrice &&
                matchesRating &&
                matchesPropertyType &&
                matchesAmenities &&
                matchesBeds &&
                matchesConnectingRooms &&
                matchesGoodFor &&
                matchesGuests
            );
        });

    const sortedListings = [
        ...filteredListings,
    ].sort((a, b) => {
        switch (sortOption) {
            case "price-low":
                return (
                    a.pricePerNight -
                    b.pricePerNight
                );

            case "price-high":
                return (
                    b.pricePerNight -
                    a.pricePerNight
                );

            case "rating":
                return (
                    b.rating -
                    a.rating
                );

            default:
                return 0;
        }
    });

    /*
     * Initial home page only shows three
     * recommended listings.
     */
    const displayedListings =
        hasSearched ||
        showAllPopular
            ? sortedListings
            : sortedListings.slice(
                0,
                3,
            );

    const shouldPaginate =
        hasSearched ||
        showAllPopular;

    const totalPages = Math.max(
        1,
        Math.ceil(
            displayedListings.length /
            RESULTS_PER_PAGE,
        ),
    );

    const startIndex =
        (currentPage - 1) *
        RESULTS_PER_PAGE;

    const paginatedListings =
        shouldPaginate
            ? displayedListings.slice(
                startIndex,
                startIndex +
                RESULTS_PER_PAGE,
            )
            : displayedListings;

    const minPricePercent =
        (minPrice / MAX_PRICE) * 100;

    const maxPricePercent =
        (maxPrice / MAX_PRICE) * 100;

    const activeFilterCount =
        (minPrice > 0 ||
        maxPrice < MAX_PRICE
            ? 1
            : 0) +
        (minimumRating > 0
            ? 1
            : 0) +
        selectedAmenities.length +
        selectedPropertyTypes.length +
        (minimumBeds > 0
            ? 1
            : 0) +
        (connectingRoomsOnly
            ? 1
            : 0) +
        selectedGoodFor.length;

    const dateLabel = (() => {
        if (
            !selectedDates?.from
        ) {
            return "Add dates";
        }

        if (
            !selectedDates.to
        ) {
            return `${format(
                selectedDates.from,
                "MMM d, yyyy",
            )} – Select check-out`;
        }

        return `${format(
            selectedDates.from,
            "MMM d",
        )} – ${format(
            selectedDates.to,
            "MMM d, yyyy",
        )}`;
    })();

    const handleDateSelect = (
        range:
            | DateRange
            | undefined,
    ) => {
        setSelectedDates(range);
        setDateError("");

        if (
            range?.from &&
            range?.to
        ) {
            setDatePickerOpen(
                false,
            );

            setMonthYearPickerOpen(
                false,
            );
        }
    };

    const normalizedDestinationInput =
        destination.trim().toLowerCase();



    const matchingDestinationSuggestions =
        normalizedDestinationInput === ""
            ? []
            : destinationSuggestions
                .filter((place) =>
                    place
                        .toLowerCase()
                        .startsWith(
                            normalizedDestinationInput,
                        ),
                )
                .slice(0, 6);

    const handleSearch = () => {
        const trimmedDestination =
            destination.trim();

        const normalizedInput =
            trimmedDestination.toLowerCase();

        const destinationIsValid =
            normalizedInput.length > 0 &&
            (
                mockListings.some(
                    (stay) =>
                        stay.city
                            .toLowerCase()
                            .includes(
                                normalizedInput,
                            ) ||
                        (stay.region
                                ?.toLowerCase()
                                .includes(
                                    normalizedInput,
                                ) ??
                            false) ||
                        stay.country
                            .toLowerCase()
                            .includes(
                                normalizedInput,
                            ),
                ) ||
                popularDestinations.some(
                    (place) =>
                        place.name
                            .toLowerCase()
                            .includes(
                                normalizedInput,
                            ) ||
                        place.searchValue
                            .toLowerCase()
                            .includes(
                                normalizedInput,
                            ),
                )
            );

        const guestNumber =
            Number(guests);

        const guestsAreValid =
            guests.trim() !== "" &&
            Number.isInteger(
                guestNumber,
            ) &&
            guestNumber >= 1;

        const datesAreValid =
            Boolean(
                selectedDates?.from &&
                selectedDates?.to,
            );

        setDestinationError(
            destinationIsValid
                ? ""
                : "This is not a valid destination.",
        );

        setGuestError(
            guestsAreValid
                ? ""
                : "This is not a valid number of guests.",
        );

        setDateError(
            datesAreValid
                ? ""
                : "Please select check-in and check-out dates.",
        );

        if (
            !destinationIsValid ||
            !guestsAreValid ||
            !datesAreValid
        ) {
            return;
        }

        setSearchedDestination(
            trimmedDestination,
        );

        setHasSearched(true);
        setShowAllPopular(false);
        setSortOpen(false);
        setDatePickerOpen(false);
        setMonthYearPickerOpen(
            false,
        );
        setCurrentPage(1);
    };

    const handleScopeChange = (
        scope:
        DestinationScope,
    ) => {
        setDestinationScope(scope);
        setShowAllPopular(false);
        setSortOpen(false);
        setCurrentPage(1);
    };

    const handlePopularDestination =
        (
            searchValue:
            string,
        ) => {
            setDestination(
                searchValue,
            );

            setSearchedDestination(
                searchValue,
            );

            /*
             * Destination cards are browsing
             * shortcuts, so they do not require
             * dates or guest count first.
             */
            setHasSearched(true);
            setShowAllPopular(false);
            setSortOpen(false);
            setCurrentPage(1);
        };

    const handleViewAll = () => {
        setShowAllPopular(true);
        setSortOpen(false);
        setCurrentPage(1);
    };

    const handleReturnToStays = () => {
        setDestination("");
        setSearchedDestination("");
        setHasSearched(false);
        setShowAllPopular(false);

        setSelectedDates(undefined);
        setGuests("");

        setDestinationError("");
        setDateError("");
        setGuestError("");

        clearFilters();

        setSortOption("recommended");
        setSortOpen(false);
        setFiltersOpen(false);
        setCurrentPage(1);
    };

    const handleSortChange = (
        option: SortOption,
    ) => {
        setSortOption(option);
        setSortOpen(false);
        setCurrentPage(1);
    };

    const handlePageChange = (
        page: number,
    ) => {
        setCurrentPage(page);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const toggleAmenity = (
        amenity: string,
    ) => {
        setSelectedAmenities(
            (current) =>
                current.includes(
                    amenity,
                )
                    ? current.filter(
                        (item) =>
                            item !==
                            amenity,
                    )
                    : [
                        ...current,
                        amenity,
                    ],
        );
    };

    const togglePropertyType = (
        propertyType: string,
    ) => {
        setSelectedPropertyTypes(
            (current) =>
                current.includes(
                    propertyType,
                )
                    ? current.filter(
                        (item) =>
                            item !==
                            propertyType,
                    )
                    : [
                        ...current,
                        propertyType,
                    ],
        );
    };

    const toggleGoodFor = (
        category: GoodFor,
    ) => {
        setSelectedGoodFor(
            (current) =>
                current.includes(
                    category,
                )
                    ? current.filter(
                        (item) =>
                            item !==
                            category,
                    )
                    : [
                        ...current,
                        category,
                    ],
        );
    };

    const clearFilters = () => {
        setMinPrice(0);
        setMaxPrice(
            MAX_PRICE,
        );
        setMinimumRating(0);
        setSelectedAmenities([]);
        setSelectedPropertyTypes(
            [],
        );
        setMinimumBeds(0);
        setConnectingRoomsOnly(
            false,
        );
        setSelectedGoodFor([]);
        setShowAllAmenities(false);
        setCurrentPage(1);
    };

    const openFilters = () => {
        setSortOpen(false);
        setFiltersOpen(true);
    };

    const toggleSort = () => {
        setSortOpen(
            (current) =>
                !current,
        );
    };

    return (
        <main
            className={`${inter.className} min-h-screen bg-white text-[#070D2F]`}
        >
            {/* Header */}
            <header className="relative z-30 px-3 pb-16 sm:px-5">                <div className="absolute inset-0 overflow-hidden">
                    <PaintedBackground />
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-gradient-to-b from-transparent via-white/75 to-white" />

                {/* Navigation */}
                <div className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-2 lg:px-10">                    {/* Left side */}
                    <div className="flex items-center gap-3 md:gap-12">
                        {/* Mobile hamburger menu */}
                        <div className="relative md:hidden">
                            <button
                                type="button"
                                aria-label="Open navigation menu"
                                aria-expanded={mobileMenuOpen}
                                onClick={() => {
                                    setMobileMenuOpen(
                                        (current) => !current,
                                    );

                                    setAccountMenuOpen(false);
                                }}
                                className="flex cursor-pointer items-center justify-center p-1 text-[#070D2F] transition hover:text-[#4C79BD]"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    className="h-7 w-7"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M3 12h18" />
                                    <path d="M3 18h18" />
                                </svg>
                            </button>

                            {mobileMenuOpen && (
                                <div className="absolute left-0 top-[calc(100%+10px)] z-[100] w-48 overflow-hidden rounded-[8px] border border-[#BACBDF] bg-white py-1 shadow-xl">
                                    <Link
                                        href="/search"
                                        onClick={() => {
                                            handleReturnToStays();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#070D2F] transition hover:bg-[#FAFBFC]"
                                    >
                                        Stays
                                    </Link>

                                    <Link
                                        href="/saved"
                                        onClick={() =>
                                            setMobileMenuOpen(false)
                                        }
                                        className="block w-full px-4 py-3 text-left text-sm text-[#536383] transition hover:bg-[#FAFBFC] hover:text-[#070D2F]"
                                    >
                                        Saved
                                    </Link>

                                    <Link
                                        href="/dashboard"
                                        onClick={() =>
                                            setMobileMenuOpen(false)
                                        }
                                        className="block w-full px-4 py-3 text-left text-sm text-[#536383] transition hover:bg-[#FAFBFC] hover:text-[#070D2F]"
                                    >
                                        My bookings
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Logo */}
                        <Link
                            href="/"
                            aria-label="Return to LikeHome homepage"
                            className="inline-flex items-center"
                        >
                            <LikeHomeLogo />
                        </Link>

                        {/* Desktop navigation */}
                        <nav className="hidden items-center gap-8 text-sm md:flex">
                            <Link
                                href="/search"
                                onClick={handleReturnToStays}
                                className="font-semibold"
                            >
                                Stays
                            </Link>

                            <Link
                                href="/saved"
                                className="text-[#536383] transition hover:text-[#070D2F]"
                            >
                                Saved
                            </Link>

                            <Link
                                href="/dashboard"
                                className="text-[#536383] transition hover:text-[#070D2F]"
                            >
                                My bookings
                            </Link>
                        </nav>
                    </div>

                    {/* Account */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setAccountMenuOpen(
                                    (current) => !current,
                                );

                                setMobileMenuOpen(false);
                            }}
                            aria-expanded={accountMenuOpen}
                            className="flex h-10 w-10 items-center justify-center bg-transparent p-0 text-sm font-semibold transition md:h-auto md:w-auto md:gap-2 md:rounded-[6px] md:border md:border-[#BACBDF] md:bg-white/75 md:px-3 md:py-1.5 md:backdrop-blur-sm md:hover:bg-white"                        >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4C79BD] text-xs text-white">
                R
            </span>

                            <span className="hidden md:inline">
    Account
</span>
                        </button>

                        {accountMenuOpen && (
                            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-[8px] border border-[#BACBDF] bg-white p-2 shadow-lg">
                                <p className="px-3 py-2 text-sm text-[#536383]">
                                    Account options will go here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search area */}
                <div className="relative z-10 mx-auto -mt-0.5 max-w-7xl rounded-[30px] bg-white px-6 pb-8 pt-7 lg:px-10 lg:pb-10">
                    <section className="mb-8">
                        <h1
                            className={`${dmSerif.className} max-w-4xl text-4xl leading-tight sm:text-5xl`}
                        >
                            Where would you like
                            to feel at home?
                        </h1>

                        <p className="mt-3 max-w-2xl text-base leading-7 text-[#536383]">
                            Search stays by
                            destination, dates,
                            guests, and the
                            amenities that matter
                            to you.
                        </p>
                    </section>

                    <form
                        onSubmit={(
                            event,
                        ) => {
                            event.preventDefault();
                            handleSearch();
                        }}
                        className="rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] p-5 sm:p-6"
                    >
                        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                            {/* Destination */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold">
                                    Destination
                                </label>

                                <div className="relative">
                                    <div
                                        className={`relative rounded-[6px] border bg-white transition focus-within:border-[#4C79BD] ${
                                            destinationError
                                                ? "border-red-500"
                                                : "border-[#BACBDF]"
                                        }`}
                                    >

                                        <input
                                            type="text"
                                            value={destination}
                                            onFocus={() =>
                                                setDestinationFocused(true)
                                            }
                                            onBlur={() =>
                                                setDestinationFocused(false)
                                            }
                                            onChange={(event) => {
                                                setDestination(
                                                    event.target.value,
                                                );

                                                setDestinationError("");
                                            }}
                                            placeholder="Where are you going?"
                                            autoComplete="off"
                                            aria-invalid={
                                                Boolean(destinationError)
                                            }
                                            className="relative z-10 w-full rounded-[6px] bg-transparent px-4 py-3 text-sm text-[#070D2F] outline-none placeholder:text-[#8B97AC]"
                                        />
                                    </div>

                                    {/* Dropdown suggestions */}
                                    {destinationFocused &&
                                        matchingDestinationSuggestions.length >
                                        0 && (
                                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[8px] border border-[#BACBDF] bg-white py-1 shadow-lg">
                                                {matchingDestinationSuggestions.map(
                                                    (place) => (
                                                        <button
                                                            key={place}
                                                            type="button"
                                                            onMouseDown={(event) =>
                                                                event.preventDefault()
                                                            }
                                                            onClick={() => {
                                                                setDestination(
                                                                    place,
                                                                );

                                                                setDestinationError(
                                                                    "",
                                                                );

                                                                setDestinationFocused(
                                                                    false,
                                                                );
                                                            }}
                                                            className="block w-full px-4 py-3 text-left text-sm text-[#070D2F] transition hover:bg-[#F8FAFC]"
                                                        >
                                                            {place}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                </div>

                                {destinationError && (
                                    <p className="mt-1.5 text-xs text-red-600">
                                        {destinationError}
                                    </p>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="relative">
                                <label className="mb-2 block text-sm font-semibold">
                                    Dates
                                </label>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDatePickerOpen(
                                            (
                                                current,
                                            ) =>
                                                !current,
                                        );

                                        setMonthYearPickerOpen(
                                            false,
                                        );
                                    }}
                                    className={`w-full rounded-[6px] border bg-white px-4 py-3 text-left text-sm transition ${
                                        dateError
                                            ? "border-red-500"
                                            : datePickerOpen
                                                ? "border-[#4C79BD]"
                                                : "border-[#BACBDF]"
                                    } ${
                                        selectedDates?.from
                                            ? "text-[#070D2F]"
                                            : "text-[#536383]"
                                    }`}
                                >
                                    {
                                        dateLabel
                                    }
                                </button>

                                {dateError && (
                                    <p className="mt-1.5 text-xs text-red-600">
                                        {
                                            dateError
                                        }
                                    </p>
                                )}

                                {datePickerOpen && (
                                    <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[350px] max-w-[calc(100vw-3rem)] rounded-[12px] border border-[#BACBDF] bg-white p-4 shadow-xl">
                                        <div
                                            className={
                                                inter.className
                                            }
                                        >
                                            {/* Custom calendar header */}
                                            <div className="relative mb-3 flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setMonthYearPickerOpen(
                                                            (
                                                                current,
                                                            ) =>
                                                                !current,
                                                        )
                                                    }
                                                    className="text-lg font-semibold text-[#070D2F] transition hover:text-[#4C79BD]"
                                                >
                                                    {format(
                                                        calendarMonth,
                                                        "MMMM yyyy",
                                                    )}
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        aria-label="Previous month"
                                                        onClick={() =>
                                                            setCalendarMonth(
                                                                new Date(
                                                                    calendarMonth.getFullYear(),
                                                                    calendarMonth.getMonth() -
                                                                    1,
                                                                    1,
                                                                ),
                                                            )
                                                        }
                                                        className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-[#4C79BD] transition hover:bg-[#E7EEF8]"
                                                    >
                                                        ‹
                                                    </button>

                                                    <button
                                                        type="button"
                                                        aria-label="Next month"
                                                        onClick={() =>
                                                            setCalendarMonth(
                                                                new Date(
                                                                    calendarMonth.getFullYear(),
                                                                    calendarMonth.getMonth() +
                                                                    1,
                                                                    1,
                                                                ),
                                                            )
                                                        }
                                                        className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-[#4C79BD] transition hover:bg-[#E7EEF8]"
                                                    >
                                                        ›
                                                    </button>
                                                </div>

                                                {/* Month / year picker */}
                                                {monthYearPickerOpen && (
                                                    <div className="absolute left-0 top-11 z-30 w-full rounded-[10px] border border-[#BACBDF] bg-white p-4 shadow-lg">
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#536383]">
                                                            Month
                                                        </p>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            {MONTH_NAMES.map(
                                                                (
                                                                    month,
                                                                    index,
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            month
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setCalendarMonth(
                                                                                new Date(
                                                                                    calendarMonth.getFullYear(),
                                                                                    index,
                                                                                    1,
                                                                                ),
                                                                            )
                                                                        }
                                                                        className={`rounded-[6px] px-2 py-2 text-sm transition ${
                                                                            calendarMonth.getMonth() ===
                                                                            index
                                                                                ? "bg-[#4C79BD] font-semibold text-white"
                                                                                : "bg-[#FAFBFC] text-[#536383] hover:bg-[#E7EEF8]"
                                                                        }`}
                                                                    >
                                                                        {month.slice(
                                                                            0,
                                                                            3,
                                                                        )}
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>

                                                        <p className="mb-2 mt-4 border-t border-[#BACBDF] pt-4 text-xs font-semibold uppercase tracking-wide text-[#536383]">
                                                            Year
                                                        </p>

                                                        <div className="grid max-h-28 grid-cols-3 gap-2 overflow-y-auto">
                                                            {Array.from(
                                                                {
                                                                    length: 6,
                                                                },
                                                                (
                                                                    _,
                                                                    index,
                                                                ) =>
                                                                    new Date().getFullYear() +
                                                                    index,
                                                            ).map(
                                                                (
                                                                    year,
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            year
                                                                        }
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCalendarMonth(
                                                                                new Date(
                                                                                    year,
                                                                                    calendarMonth.getMonth(),
                                                                                    1,
                                                                                ),
                                                                            );

                                                                            setMonthYearPickerOpen(
                                                                                false,
                                                                            );
                                                                        }}
                                                                        className={`rounded-[6px] px-2 py-2 text-sm transition ${
                                                                            calendarMonth.getFullYear() ===
                                                                            year
                                                                                ? "bg-[#4C79BD] font-semibold text-white"
                                                                                : "bg-[#FAFBFC] text-[#536383] hover:bg-[#E7EEF8]"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            year
                                                                        }
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <DayPicker
                                                mode="range"
                                                min={1}
                                                month={
                                                    calendarMonth
                                                }
                                                onMonthChange={
                                                    setCalendarMonth
                                                }
                                                selected={
                                                    selectedDates
                                                }
                                                onSelect={
                                                    handleDateSelect
                                                }
                                                numberOfMonths={
                                                    1
                                                }
                                                hideNavigation
                                                disabled={{
                                                    before: new Date(),
                                                }}
                                                className="likehome-calendar"
                                            />
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-[#BACBDF] pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDates(
                                                        undefined,
                                                    );

                                                    setDateError(
                                                        "",
                                                    );
                                                }}
                                                className="text-sm font-semibold text-[#536383]"
                                            >
                                                Clear
                                                dates
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDatePickerOpen(
                                                        false,
                                                    );

                                                    setMonthYearPickerOpen(
                                                        false,
                                                    );
                                                }}
                                                className="rounded-[6px] bg-[#4C79BD] px-4 py-2 text-sm font-semibold text-white"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Guests */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold">
                                    Guests
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                        guests
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        const value =
                                            event
                                                .target
                                                .value;

                                        if (
                                            /^\d*$/.test(
                                                value,
                                            )
                                        ) {
                                            setGuests(
                                                value,
                                            );

                                            setGuestError(
                                                "",
                                            );
                                        }
                                    }}
                                    placeholder="Number of guests"
                                    aria-invalid={
                                        Boolean(
                                            guestError,
                                        )
                                    }
                                    className={`w-full rounded-[6px] border bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-[#8B97AC] focus:border-[#4C79BD] ${
                                        guestError
                                            ? "border-red-500"
                                            : "border-[#BACBDF]"
                                    }`}
                                />

                                {guestError && (
                                    <p className="mt-1.5 text-xs text-red-600">
                                        {
                                            guestError
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Search */}
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="w-full rounded-[6px] bg-[#4C79BD] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#3F69A7] lg:w-auto"
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </header>

            {/* Main content */}
            <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-10">
                {!hasSearched &&
                !showAllPopular ? (
                    <>
                        {/* Popular destinations */}
                        <section className="mb-12">
                            <h2
                                className={`${dmSerif.className} text-3xl`}
                            >
                                Popular
                                destinations
                            </h2>

                            <p className="mt-1 text-sm text-[#536383]">
                                Browse the most
                                popular stays nearby,
                                across the country, or
                                around the world.
                            </p>

                            {/* Scope */}
                            <div className="mb-6 mt-5 flex flex-wrap gap-3">
                                {[
                                    {
                                        value: "nearby",
                                        label: "Near you",
                                    },
                                    {
                                        value: "national",
                                        label: "National",
                                    },
                                    {
                                        value: "international",
                                        label: "International",
                                    },
                                ].map(
                                    ({
                                         value,
                                         label,
                                     }) => (
                                        <button
                                            key={
                                                value
                                            }
                                            type="button"
                                            onClick={() =>
                                                handleScopeChange(
                                                    value as DestinationScope,
                                                )
                                            }
                                            className={`rounded-[6px] border border-[#BACBDF] px-4 py-2 text-sm font-semibold transition ${
                                                destinationScope ===
                                                value
                                                    ? "bg-[#4C79BD] text-white"
                                                    : "bg-[#FAFBFC] text-[#070D2F] hover:border-[#4C79BD]"
                                            }`}
                                        >
                                            {
                                                label
                                            }
                                        </button>
                                    ),
                                )}
                            </div>

                            {/* Desktop top five */}
                            <div className="hidden h-[390px] grid-cols-5 grid-rows-2 gap-3 lg:grid">
                                {visibleDestinations.map(
                                    (
                                        place,
                                        index,
                                    ) => (
                                        <DestinationCard
                                            key={
                                                place.name
                                            }
                                            place={
                                                place
                                            }
                                            rank={
                                                index +
                                                1
                                            }
                                            className={
                                                desktopDestinationLayouts[
                                                    index
                                                    ]
                                            }
                                            onClick={() =>
                                                handlePopularDestination(
                                                    place.searchValue,
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </div>

                            {/* Smaller screens top three */}
                            <div className="grid grid-cols-2 gap-3 lg:hidden">
                                {visibleDestinations
                                    .slice(
                                        0,
                                        3,
                                    )
                                    .map(
                                        (
                                            place,
                                            index,
                                        ) => (
                                            <DestinationCard
                                                key={
                                                    place.name
                                                }
                                                place={
                                                    place
                                                }
                                                rank={
                                                    index +
                                                    1
                                                }
                                                className={
                                                    index ===
                                                    0
                                                        ? "col-span-2 h-56"
                                                        : "h-40"
                                                }
                                                onClick={() =>
                                                    handlePopularDestination(
                                                        place.searchValue,
                                                    )
                                                }
                                            />
                                        ),
                                    )}
                            </div>
                        </section>

                        {/* Initial recommended stays */}
                        <section className="pt-2">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <h2
                                        className={`${dmSerif.className} text-3xl`}
                                    >
                                        Recommended
                                        stays
                                    </h2>

                                    <p className="mt-1 text-sm text-[#536383]">
                                        Popular stays
                                        from these
                                        destinations.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        handleViewAll
                                    }
                                    className="rounded-[6px] px-3 py-2.5 text-sm font-semibold text-[#4C79BD]"
                                >
                                    View all
                                </button>
                            </div>

                            {paginatedListings.length >
                            0 ? (
                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {paginatedListings.map(
                                        (stay) => (
                                            <ListingCard
                                                key={
                                                    stay.id
                                                }
                                                stay={
                                                    stay
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] p-8 text-center">
                                    <h3 className="font-semibold">
                                        No matching
                                        stays
                                    </h3>
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    /* Full results mode:
                       either View all or Search */
                    <section>
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <h2
                                    className={`${dmSerif.className} text-3xl`}
                                >
                                    {hasSearched
                                        ? "Search results"
                                        : "Recommended stays"}
                                </h2>

                                <p className="mt-1 text-sm text-[#536383]">
                                    {
                                        displayedListings.length
                                    }{" "}
                                    {displayedListings.length ===
                                    1
                                        ? "stay"
                                        : "stays"}

                                    {hasSearched &&
                                        searchedDestination &&
                                        ` found for "${searchedDestination}"`}
                                </p>
                            </div>

                            <ListingsToolbar
                                activeFilterCount={
                                    activeFilterCount
                                }
                                sortOption={
                                    sortOption
                                }
                                sortOpen={
                                    sortOpen
                                }
                                onOpenFilters={
                                    openFilters
                                }
                                onToggleSort={
                                    toggleSort
                                }
                                onSortChange={
                                    handleSortChange
                                }
                            />
                        </div>

                        {paginatedListings.length >
                        0 ? (
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {paginatedListings.map(
                                    (stay) => (
                                        <ListingCard
                                            key={
                                                stay.id
                                            }
                                            stay={
                                                stay
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="pointer-events-none relative flex min-h-[430px] items-center justify-center overflow-hidden rounded-[18px] px-6 py-10">                                {/* Same animated painted background as the header */}
                                <div className="absolute inset-0">
                                    <PaintedBackground />
                                </div>

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <img
                                        src="/no-stays-window.png"
                                        alt=""
                                        className="h-auto w-[180px] sm:w-[210px]"
                                    />

                                    <h3
                                        className={`${dmSerif.className} mt-5 text-3xl text-[#070D2F] sm:text-4xl`}
                                    >
                                        Sorry, no stays found.
                                    </h3>

                                    <p className="mt-2 text-sm text-[#536383] sm:text-base">
                                        Try changing your destination or filters.
                                    </p>

                                    <div className="mt-5 h-[3px] w-24 rounded-full bg-[#4C79BD]" />
                                </div>
                            </div>
                        )}

                        {totalPages >
                            1 && (
                                <Pagination
                                    currentPage={
                                        currentPage
                                    }
                                    totalPages={
                                        totalPages
                                    }
                                    onPageChange={
                                        handlePageChange
                                    }
                                />
                            )}
                    </section>
                )}
            </div>

            {/* Filter modal */}
            {filtersOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070D2F]/35 px-4 py-8">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="filters-title"
                        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#BACBDF] px-6 py-5">
                            <h2
                                id="filters-title"
                                className="text-xl font-bold"
                            >
                                Filters
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setFiltersOpen(false)
                                }
                                aria-label="Close filters"
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#FAFBFC] text-[#536383] transition hover:bg-[#E7EEF8] hover:text-[#070D2F]"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <path d="M6 6l12 12" />
                                    <path d="M18 6L6 18" />
                                </svg>
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="overflow-y-auto px-6 py-5">
                            {/* Price */}
                            <section className="border-b border-[#BACBDF] pb-6">
                                <h3 className="font-bold">
                                    Price range
                                </h3>

                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <label>
                                        <span className="mb-2 block text-sm text-[#536383]">
                                            Min price
                                        </span>

                                        <div className="rounded-[6px] border border-[#BACBDF] bg-white px-4 py-3">
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
                                                                Number(
                                                                    event.target.value,
                                                                ),
                                                            ),
                                                            maxPrice,
                                                        ),
                                                    )
                                                }
                                                className="ml-1 w-[80%] bg-transparent outline-none"
                                            />
                                        </div>
                                    </label>

                                    <label>
                                        <span className="mb-2 block text-sm text-[#536383]">
                                            Max price
                                        </span>

                                        <div className="rounded-[6px] border border-[#BACBDF] bg-white px-4 py-3">
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
                                                                Number(
                                                                    event.target.value,
                                                                ),
                                                            ),
                                                        ),
                                                    )
                                                }
                                                className="ml-1 w-[80%] bg-transparent outline-none"
                                            />
                                        </div>
                                    </label>
                                </div>

                                <div className="relative mt-6 h-7">
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
                                                    Number(
                                                        event.target.value,
                                                    ),
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
                                                    Number(
                                                        event.target.value,
                                                    ),
                                                    minPrice,
                                                ),
                                            )
                                        }
                                        aria-label="Maximum price"
                                        className="likehome-dual-range absolute inset-0 z-20 w-full"
                                    />
                                </div>
                            </section>

                            {/* Rating */}
                            <section className="border-b border-[#BACBDF] py-6">
                                <h3 className="font-bold">
                                    Rating
                                </h3>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {[
                                        [0, "Any"],
                                        [4, "4.0+"],
                                        [4.5, "4.5+"],
                                        [4.8, "4.8+"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() =>
                                                setMinimumRating(
                                                    Number(value),
                                                )
                                            }
                                            className={`rounded-full border px-4 py-2 text-sm transition ${
                                                minimumRating ===
                                                Number(value)
                                                    ? "border-[#4C79BD] bg-[#4C79BD] text-white"
                                                    : "border-[#BACBDF] bg-[#FAFBFC] text-[#536383] hover:border-[#4C79BD]"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Property type */}
                            <section className="border-b border-[#BACBDF] py-6">
                                <h3 className="font-bold">
                                    Property type
                                </h3>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {propertyTypeOptions.map(
                                        (propertyType) => {
                                            const selected =
                                                selectedPropertyTypes.includes(
                                                    propertyType,
                                                );

                                            return (
                                                <button
                                                    key={propertyType}
                                                    type="button"
                                                    onClick={() =>
                                                        togglePropertyType(
                                                            propertyType,
                                                        )
                                                    }
                                                    className={`rounded-full border px-4 py-2 text-sm transition ${
                                                        selected
                                                            ? "border-[#4C79BD] bg-[#E7EEF8] text-[#070D2F]"
                                                            : "border-[#BACBDF] bg-[#FAFBFC] text-[#536383] hover:border-[#4C79BD]"
                                                    }`}
                                                >
                                                    {selected && "✓ "}
                                                    {propertyType}
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </section>

                            {/* Amenities */}
                            <section className="border-b border-[#BACBDF] py-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="font-bold">
                                        Amenities
                                    </h3>

                                    {amenityOptions.length >
                                        COLLAPSED_AMENITY_COUNT && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowAllAmenities(
                                                        (current) =>
                                                            !current,
                                                    )
                                                }
                                                className="text-sm font-semibold text-[#4C79BD] transition hover:text-[#3F69A7]"
                                            >
                                                {showAllAmenities
                                                    ? "Show less"
                                                    : "Show more"}
                                            </button>
                                        )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {visibleAmenityOptions.map(
                                        (amenity) => {
                                            const selected =
                                                selectedAmenities.includes(
                                                    amenity,
                                                );

                                            return (
                                                <button
                                                    key={amenity}
                                                    type="button"
                                                    onClick={() =>
                                                        toggleAmenity(
                                                            amenity,
                                                        )
                                                    }
                                                    className={`rounded-full border px-4 py-2 text-sm transition ${
                                                        selected
                                                            ? "border-[#4C79BD] bg-[#E7EEF8] text-[#070D2F]"
                                                            : "border-[#BACBDF] bg-[#FAFBFC] text-[#536383] hover:border-[#4C79BD]"
                                                    }`}
                                                >
                                                    {selected && "✓ "}
                                                    {amenity}
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </section>

                            {/* Beds */}
                            <section className="border-b border-[#BACBDF] py-6">
                                <h3 className="font-bold">
                                    Beds
                                </h3>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {[
                                        [0, "Any"],
                                        [1, "1+"],
                                        [2, "2+"],
                                        [3, "3+"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() =>
                                                setMinimumBeds(
                                                    Number(value),
                                                )
                                            }
                                            className={`rounded-full border px-4 py-2 text-sm transition ${
                                                minimumBeds ===
                                                Number(value)
                                                    ? "border-[#4C79BD] bg-[#4C79BD] text-white"
                                                    : "border-[#BACBDF] bg-[#FAFBFC] text-[#536383] hover:border-[#4C79BD]"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Room features */}
                            <section className="border-b border-[#BACBDF] py-6">
                                <h3 className="font-bold">
                                    Room features
                                </h3>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConnectingRoomsOnly(
                                                (current) =>
                                                    !current,
                                            )
                                        }
                                        className={`rounded-full border px-4 py-2 text-sm transition ${
                                            connectingRoomsOnly
                                                ? "border-[#4C79BD] bg-[#E7EEF8] text-[#070D2F]"
                                                : "border-[#BACBDF] bg-[#FAFBFC] text-[#536383] hover:border-[#4C79BD]"
                                        }`}
                                    >
                                        {connectingRoomsOnly &&
                                            "✓ "}
                                        Connecting rooms
                                    </button>
                                </div>
                            </section>

                            {/* Good for */}
                            <section className="py-6">
                                <h3 className="font-bold">
                                    Good for
                                </h3>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {goodForOptions.map(
                                        (category) => {
                                            const selected =
                                                selectedGoodFor.includes(
                                                    category,
                                                );

                                            return (
                                                <button
                                                    key={category}
                                                    type="button"
                                                    onClick={() =>
                                                        toggleGoodFor(
                                                            category,
                                                        )
                                                    }
                                                    className={`rounded-full border px-4 py-2 text-sm transition ${
                                                        selected
                                                            ? "border-[#4C79BD] bg-[#E7EEF8] text-[#070D2F]"
                                                            : "border-[#BACBDF] bg-[#FAFBFC] text-[#536383] hover:border-[#4C79BD]"
                                                    }`}
                                                >
                                                    {selected && "✓ "}
                                                    {category}
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Filter footer */}
                        <div className="flex items-center justify-between gap-4 border-t border-[#BACBDF] px-6 py-4">
                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="cursor-pointer rounded-[6px] border border-[#BACBDF] bg-[#FAFBFC] px-5 py-2.5 text-sm font-semibold text-[#536383] transition hover:border-[#4C79BD] hover:bg-[#E7EEF8] hover:text-[#070D2F]"
                            >
                                Clear all
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setFiltersOpen(
                                        false,
                                    );

                                    setCurrentPage(
                                        1,
                                    );

                                    /*
                                     * Using filters from
                                     * the home page should
                                     * also enter full
                                     * results mode.
                                     */
                                    if (
                                        !hasSearched
                                    ) {
                                        setShowAllPopular(
                                            true,
                                        );
                                    }
                                }}
                                className="rounded-[6px] bg-[#4C79BD] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3F69A7]"
                            >
                                Show{" "}
                                {
                                    sortedListings.length
                                }{" "}
                                {sortedListings.length ===
                                1
                                    ? "result"
                                    : "results"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
