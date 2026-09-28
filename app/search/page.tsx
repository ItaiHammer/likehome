"use client";

import { useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

import EmptyResults from "./components/EmptyResults";
import FilterModal from "./components/FilterModal";
import ListingCard from "./components/ListingCard";
import ListingsToolbar from "./components/ListingsToolbar";
import Navbar from "./components/Navbar";
import Pagination from "./components/Pagination";
import PopularDestinations from "./components/PopularDestinations";
import SearchForm from "./components/SearchForm";
import { dmSerif, inter } from "./lib/fonts";
import {
    MAX_PRICE,
    RESULTS_PER_PAGE,
    type SortOption,
} from "./lib/searchConfig";
import {
    buildDestinationSuggestions,
    listingHasAmenity,
    listingMatchesDestination,
    resolveDestinationSearchValue,
} from "./lib/searchUtils";
import {
    mockListings,
    popularDestinations,
} from "./mockListings";
import type {
    DestinationScope,
    GoodFor,
    PropertyType,
} from "./types";
const DESTINATION_SUGGESTIONS = buildDestinationSuggestions(
    mockListings,
    popularDestinations,
);

export default function SearchPage() {
    /*
     * TODO(AUTH): This is the authenticated LikeHome landing/home page.
     * Once account auth is connected, protect this route and redirect users
     * without a valid session to sign in/sign up before rendering this page.
     */

    // ---------------------------------------------------------------------
    // Search state
    // ---------------------------------------------------------------------

    const [destination, setDestination] = useState("");
    const [searchedDestination, setSearchedDestination] = useState("");
    const [selectedDates, setSelectedDates] = useState<DateRange | undefined>();
    const [guests, setGuests] = useState("");
    const [searchedGuests, setSearchedGuests] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [searchUiResetKey, setSearchUiResetKey] = useState(0);

    const [destinationError, setDestinationError] = useState("");
    const [dateError, setDateError] = useState("");
    const [guestError, setGuestError] = useState("");

    // ---------------------------------------------------------------------
    // Browse / results state
    // ---------------------------------------------------------------------

    const [destinationScope, setDestinationScope] =
        useState<DestinationScope>("nearby");
    const [browseResultsMode, setBrowseResultsMode] = useState<
        "recommended" | null
    >(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOption, setSortOption] = useState<SortOption>("recommended");
    const [filtersOpen, setFiltersOpen] = useState(false);

    // ---------------------------------------------------------------------
    // Filter state
    // ---------------------------------------------------------------------

    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
    const [minimumRating, setMinimumRating] = useState(0);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<
        PropertyType[]
    >([]);
    const [minimumBeds, setMinimumBeds] = useState(0);
    const [connectingRoomsOnly, setConnectingRoomsOnly] = useState(false);
    const [selectedGoodFor, setSelectedGoodFor] = useState<GoodFor[]>([]);

    // ---------------------------------------------------------------------
    // Derived browse/search data
    // ---------------------------------------------------------------------

    const visibleDestinations = popularDestinations.filter(
        (place) => place.scope === destinationScope,
    );

    const normalizedDestinationInput = destination.trim().toLowerCase();

    const matchingDestinationSuggestions =
        normalizedDestinationInput === ""
            ? []
            : DESTINATION_SUGGESTIONS.filter((place) =>
                  place.toLowerCase().startsWith(normalizedDestinationInput),
              ).slice(0, 6);

    /*
     * Popular destination display names can differ from the actual searchable
     * city. Example: "Mallorca" resolves to "Palma" before local filtering.
     */
    const resolvedSearchedDestination = resolveDestinationSearchValue(
        searchedDestination,
        popularDestinations,
    );

    const destinationListings = mockListings.filter((stay) =>
        listingMatchesDestination(stay, resolvedSearchedDestination),
    );

    const popularListings = mockListings.filter((stay) =>
        visibleDestinations.some((place) =>
            listingMatchesDestination(stay, place.searchValue),
        ),
    );

    const baseListings = hasSearched ? destinationListings : popularListings;

    /*
     * TODO(INTEGRATION): This entire local filter/sort/pagination pipeline is
     * temporary. Confirm with the backend team whether the frontend should call
     * a project API endpoint or another Supabase-backed service layer.
     *
     * When connected, send destination, check-in/check-out, guests, filters,
     * sort, and pagination to that layer and render the returned listing data.
     *
     * TODO(BACKEND): Date availability is NOT simulated by mock data. The
     * backend must use selectedDates.from / selectedDates.to to exclude stays
     * that are unavailable for the requested range.
     *
     * TODO(ERROR): Add separate loading and request-failure states when the API
     * is connected. A failed request should not use the valid zero-results UI.
     */
    const filteredListings = baseListings.filter((stay) => {
        const matchesPrice =
            stay.pricePerNight >= minPrice && stay.pricePerNight <= maxPrice;
        const matchesRating = stay.rating >= minimumRating;
        const matchesPropertyType =
            selectedPropertyTypes.length === 0 ||
            selectedPropertyTypes.includes(stay.propertyType);
        const matchesAmenities = selectedAmenities.every((amenity) =>
            listingHasAmenity(stay, amenity),
        );
        const matchesBeds = minimumBeds === 0 || stay.beds >= minimumBeds;
        const matchesConnectingRooms =
            !connectingRoomsOnly || stay.connectingRooms;
        const matchesGoodFor = selectedGoodFor.every((category) =>
            stay.goodFor.includes(category),
        );

        // Keep guest capacity active whenever a guest value is present.
        // This prevents "Clear filters" from showing stays that no longer
        // match the guest count already entered in the search bar.
        const matchesGuests =
            !hasSearched ||
            searchedGuests === "" ||
            stay.maxGuests >= Number(searchedGuests);
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

    const sortedListings = [...filteredListings].sort((a, b) => {
        switch (sortOption) {
            case "price-low":
                return a.pricePerNight - b.pricePerNight;
            case "price-high":
                return b.pricePerNight - a.pricePerNight;
            case "rating":
                return b.rating - a.rating;
            default:
                // TODO(BACKEND): Replace mock ordering with the backend's
                // recommendation/relevance ranking.
                return 0;
        }
    });

    const displayedListings =
        hasSearched || browseResultsMode !== null
            ? sortedListings
            : sortedListings.slice(0, 3);

    const shouldPaginate = hasSearched || browseResultsMode !== null;
    const totalPages = Math.max(
        1,
        Math.ceil(displayedListings.length / RESULTS_PER_PAGE),
    );
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const paginatedListings = shouldPaginate
        ? displayedListings.slice(startIndex, startIndex + RESULTS_PER_PAGE)
        : displayedListings;

    const activeFilterCount =
        (minPrice > 0 || maxPrice < MAX_PRICE ? 1 : 0) +
        (minimumRating > 0 ? 1 : 0) +
        selectedAmenities.length +
        selectedPropertyTypes.length +
        (minimumBeds > 0 ? 1 : 0) +
        (connectingRoomsOnly ? 1 : 0) +
        selectedGoodFor.length;

    // ---------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------

    const clearFilters = () => {
        setMinPrice(0);
        setMaxPrice(MAX_PRICE);
        setMinimumRating(0);
        setSelectedAmenities([]);
        setSelectedPropertyTypes([]);
        setMinimumBeds(0);
        setConnectingRoomsOnly(false);
        setSelectedGoodFor([]);
        setCurrentPage(1);
    };

    const handleChangeDestination = () => {
        setDestination("");
        setSearchedDestination("");
        setDestinationError("");
        setHasSearched(false);
        setBrowseResultsMode(null);
        setCurrentPage(1);
        setSearchUiResetKey((current) => current + 1);
        setSearchedGuests("");

        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    const handleSearch = () => {
        const trimmedDestination = destination.trim();
        const normalizedInput = trimmedDestination.toLowerCase();

        const destinationIsValid =
            normalizedInput.length > 0 &&
            (mockListings.some((stay) =>
                listingMatchesDestination(stay, normalizedInput),
            ) ||
                popularDestinations.some(
                    (place) =>
                        place.name.toLowerCase().includes(normalizedInput) ||
                        place.searchValue.toLowerCase().includes(normalizedInput),
                ));

        const guestNumber = Number(guests);
        const guestsAreValid =
            guests.trim() !== "" &&
            Number.isInteger(guestNumber) &&
            guestNumber >= 1;

        const datesAreValid = Boolean(selectedDates?.from && selectedDates?.to);

        setDestinationError(
            destinationIsValid ? "" : "This is not a valid destination.",
        );
        setGuestError(
            guestsAreValid ? "" : "This is not a valid number of guests.",
        );
        setDateError(
            datesAreValid
                ? ""
                : "Please select check-in and check-out dates.",
        );

        if (!destinationIsValid || !guestsAreValid || !datesAreValid) {
            return;
        }

        /*
         * TODO(BACKEND): Replace this local transition with the real search
         * request. Include destination, selectedDates.from, selectedDates.to,
         * guests, filters, sort, and pagination in the agreed request format.
         */
        setSearchedDestination(trimmedDestination);
        setSearchedGuests(guests.trim());
        setHasSearched(true);
        setBrowseResultsMode(null);
        setCurrentPage(1);
        setSearchUiResetKey((current) => current + 1);
    };

    const handleScopeChange = (scope: DestinationScope) => {
        setDestinationScope(scope);
        setBrowseResultsMode(null);
        setCurrentPage(1);
    };

    const handlePopularDestination = (searchValue: string) => {
        setDestination(searchValue);
        setSearchedDestination(searchValue);
        setSearchedGuests("");

        // Destination cards are browsing shortcuts, so dates/guests are not
        // required before showing their listings.
        setHasSearched(true);
        setBrowseResultsMode(null);
        setCurrentPage(1);
    };

    const resultsSectionRef = useRef<HTMLElement | null>(null);

    const scrollToResults = () => {
        // Wait for the compact results layout to render before moving the
        // viewport. This prevents the browser from preserving the previous
        // scroll position from the taller browse/home layout.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resultsSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            });
        });
    };

    const handleViewAllRecommended = () => {
        setBrowseResultsMode("recommended");
        setCurrentPage(1);
        scrollToResults();
    };

    const handleReturnToStays = () => {
        setDestination("");
        setSearchedDestination("");
        setSelectedDates(undefined);
        setGuests("");
        setSearchedGuests("");

        setDestinationError("");
        setDateError("");
        setGuestError("");

        setHasSearched(false);
        setBrowseResultsMode(null);
        setSortOption("recommended");
        setFiltersOpen(false);
        clearFilters();
        setSearchUiResetKey((current) => current + 1);
    };

    const handleSortChange = (option: SortOption) => {
        setSortOption(option);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const toggleAmenity = (amenity: string) => {
        setSelectedAmenities((current) =>
            current.includes(amenity)
                ? current.filter((item) => item !== amenity)
                : [...current, amenity],
        );
    };

    const togglePropertyType = (propertyType: PropertyType) => {
        setSelectedPropertyTypes((current) =>
            current.includes(propertyType)
                ? current.filter((item) => item !== propertyType)
                : [...current, propertyType],
        );
    };

    const toggleGoodFor = (category: GoodFor) => {
        setSelectedGoodFor((current) =>
            current.includes(category)
                ? current.filter((item) => item !== category)
                : [...current, category],
        );
    };

    const handleApplyFilters = () => {
        setFiltersOpen(false);
        setCurrentPage(1);

        // Applying filters from the home view enters full-results mode.
        if (!hasSearched) {
            setBrowseResultsMode("recommended");
        }
    };

    const isBrowseHome = !hasSearched && browseResultsMode === null;

    return (
        <main className={`${inter.className} min-h-screen bg-white text-[#070D2F]`}>
            {isBrowseHome ? (
                /*
                 * Browse/home state: this is intentionally the more welcoming,
                 * spacious version of the page. The full headline and curved
                 * white hero distinguish browsing from an active results view.
                 */
                <header className="relative z-30 overflow-visible bg-white pb-2">
                    <div className="relative z-20 bg-white">
                        <Navbar onReturnToStays={handleReturnToStays} />
                    </div>

                    {/*
                     * Decorative side panels are independent of the hero width.
                     * Keeping them as narrow edge elements prevents them from
                     * drifting away from the layout at wide/zoomed viewports.
                     * They extend slightly farther down and then fade before the browse content.
                     */}
                    <div className="pointer-events-none absolute left-0 top-[64px] z-0 -bottom-5 w-4 rounded-tr-[999px] bg-[linear-gradient(to_bottom,#E7EEF8_0%,#E7EEF8_52%,rgba(231,238,248,0.76)_70%,rgba(231,238,248,0)_100%)] sm:w-8 lg:w-20" />
                    <div className="pointer-events-none absolute right-0 top-[64px] z-0 -bottom-5 w-4 rounded-tl-[999px] bg-[linear-gradient(to_bottom,#E7EEF8_0%,#E7EEF8_52%,rgba(231,238,248,0.76)_70%,rgba(231,238,248,0)_100%)] sm:w-8 lg:w-20" />

                    {/* White hero; spacing below is intentionally compact so the
                     * browse content starts soon after the search controls. */}
                    <div className="relative z-10 mx-4 bg-white sm:mx-8 lg:mx-20">
                        <div className="mx-auto max-w-7xl px-6 pb-4 pt-8 lg:px-10 lg:pb-5 lg:pt-10">
                            <section className="mb-7">
                                <h1
                                    className={`${dmSerif.className} max-w-4xl text-4xl leading-tight text-[#070D2F] sm:text-5xl`}
                                >
                                    Where would you like to feel at home?
                                </h1>
                                <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-[#536383]">
                                    Search stays by destination, dates, guests, and the
                                    amenities that matter to you.
                                </p>
                            </section>

                            <SearchForm
                                key={searchUiResetKey}
                                destination={destination}
                                setDestination={setDestination}
                                destinationError={destinationError}
                                setDestinationError={setDestinationError}
                                selectedDates={selectedDates}
                                setSelectedDates={setSelectedDates}
                                dateError={dateError}
                                setDateError={setDateError}
                                guests={guests}
                                setGuests={setGuests}
                                guestError={guestError}
                                setGuestError={setGuestError}
                                matchingDestinationSuggestions={
                                    matchingDestinationSuggestions
                                }
                                activeFilterCount={activeFilterCount}
                                filtersOpen={filtersOpen}
                                onOpenFilters={() => setFiltersOpen(true)}
                                onSearch={handleSearch}
                            />
                        </div>
                    </div>
                </header>
            ) : (
                /*
                 * Results state: preserve the same visual header language as
                 * the browse/home page, but remove the oversized headline and keep
                 * only the compact search controls. Filters remain available only
                 * in SearchForm.
                 */
                <header className="relative z-30 overflow-visible bg-white pb-2">
                    <div className="relative z-20 bg-white">
                        <Navbar onReturnToStays={handleReturnToStays} />
                    </div>

                    {/* Results keep the same edge treatment as the browse page,
                     * but the panels extend below the compact search bar and fade
                     * before the results content takes over. */}
                    <div className="pointer-events-none absolute left-0 top-[64px] z-0 -bottom-7 w-4 rounded-tr-[999px] bg-[linear-gradient(to_bottom,#E7EEF8_0%,rgba(231,238,248,0.82)_48%,rgba(231,238,248,0.52)_72%,rgba(231,238,248,0)_100%)] sm:w-8 lg:w-20" />
                    <div className="pointer-events-none absolute right-0 top-[64px] z-0 -bottom-7 w-4 rounded-tl-[999px] bg-[linear-gradient(to_bottom,#E7EEF8_0%,rgba(231,238,248,0.82)_48%,rgba(231,238,248,0.52)_72%,rgba(231,238,248,0)_100%)] sm:w-8 lg:w-20" />

                    <div className="relative z-10 mx-4 bg-white sm:mx-8 lg:mx-20">
                        <div className="mx-auto max-w-7xl px-6 pb-4 pt-4 lg:px-10 lg:pb-5 lg:pt-5">
                            <SearchForm
                                key={searchUiResetKey}
                                destination={destination}
                                setDestination={setDestination}
                                destinationError={destinationError}
                                setDestinationError={setDestinationError}
                                selectedDates={selectedDates}
                                setSelectedDates={setSelectedDates}
                                dateError={dateError}
                                setDateError={setDateError}
                                guests={guests}
                                setGuests={setGuests}
                                guestError={guestError}
                                setGuestError={setGuestError}
                                matchingDestinationSuggestions={
                                    matchingDestinationSuggestions
                                }
                                activeFilterCount={activeFilterCount}
                                filtersOpen={filtersOpen}
                                onOpenFilters={() => setFiltersOpen(true)}
                                onSearch={handleSearch}
                            />
                        </div>
                    </div>
                </header>
            )}

            <div
                className={`mx-auto max-w-7xl px-6 pb-12 lg:px-10 ${
                    isBrowseHome ? "pt-5" : "pt-7"
                }`}
            >
                {isBrowseHome ? (
                    <>
                        <PopularDestinations
                            destinations={visibleDestinations}
                            destinationScope={destinationScope}
                            onScopeChange={handleScopeChange}
                            onDestinationSelect={handlePopularDestination}
                        />

                        <section className="pt-2">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <h2 className={`${dmSerif.className} text-3xl`}>
                                        Recommended stays
                                    </h2>
                                    <p className="mt-1 text-sm text-[#536383]">
                                        Popular stays from these destinations.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleViewAllRecommended}
                                    className="rounded-[6px] px-3 py-2.5 text-sm font-semibold text-[#4C79BD]"
                                >
                                    View all
                                </button>
                            </div>

                            {paginatedListings.length > 0 ? (
                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {paginatedListings.map((stay) => (
                                        <ListingCard key={stay.id} stay={stay} />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[6px] border border-[#BACBDF] bg-white p-8 text-center">
                                    <h3 className="font-semibold">
                                        No matching stays
                                    </h3>
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    <section ref={resultsSectionRef} className="scroll-mt-6">
                        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-[#BACBDF] pb-6">
                            <div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#4C79BD]">
                                    {hasSearched
                                        ? "Search results"
                                        : "Browse recommendations"}
                                </p>
                                <h1 className={`${dmSerif.className} text-3xl sm:text-4xl`}>
                                    {hasSearched && searchedDestination
                                        ? `Stays in ${searchedDestination}`
                                        : "Recommended stays"}
                                </h1>
                                <p className="mt-2 text-sm font-medium text-[#536383]">
                                    {displayedListings.length}{" "}
                                    {displayedListings.length === 1
                                        ? "stay"
                                        : "stays"}
                                    {activeFilterCount > 0 &&
                                        ` · ${activeFilterCount} ${
                                            activeFilterCount === 1
                                                ? "filter"
                                                : "filters"
                                        } applied`}
                                </p>
                            </div>

                            {/* Sorting stays with results; filtering lives in SearchForm. */}
                            <ListingsToolbar
                                sortOption={sortOption}
                                onSortChange={handleSortChange}
                            />
                        </div>

                        {paginatedListings.length > 0 ? (
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {paginatedListings.map((stay) => (
                                    <ListingCard key={stay.id} stay={stay} />
                                ))}
                            </div>
                        ) : (
                            <EmptyResults
                                canClearFilters={activeFilterCount > 0}
                                onClearFilters={clearFilters}
                                onChangeDestination={handleChangeDestination}
                            />
                        )}

                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </section>
                )}
            </div>

            <FilterModal
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                minPrice={minPrice}
                maxPrice={maxPrice}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                minimumRating={minimumRating}
                setMinimumRating={setMinimumRating}
                selectedAmenities={selectedAmenities}
                toggleAmenity={toggleAmenity}
                selectedPropertyTypes={selectedPropertyTypes}
                togglePropertyType={togglePropertyType}
                minimumBeds={minimumBeds}
                setMinimumBeds={setMinimumBeds}
                connectingRoomsOnly={connectingRoomsOnly}
                setConnectingRoomsOnly={setConnectingRoomsOnly}
                selectedGoodFor={selectedGoodFor}
                toggleGoodFor={toggleGoodFor}
                resultCount={sortedListings.length}
                onClear={clearFilters}
                onApply={handleApplyFilters}
            />
        </main>
    );
}

