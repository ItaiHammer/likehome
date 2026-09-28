"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";

import { inter } from "../lib/fonts";
import { MONTH_NAMES } from "../lib/searchConfig";

type SearchFormProps = {
    destination: string;
    setDestination: (value: string) => void;
    destinationError: string;
    setDestinationError: (value: string) => void;

    selectedDates: DateRange | undefined;
    setSelectedDates: (value: DateRange | undefined) => void;
    dateError: string;
    setDateError: (value: string) => void;

    guests: string;
    setGuests: (value: string) => void;
    guestError: string;
    setGuestError: (value: string) => void;

    matchingDestinationSuggestions: string[];
    activeFilterCount: number;
    filtersOpen: boolean;
    onOpenFilters: () => void;
    onSearch: () => void;
};

export default function SearchForm({
    destination,
    setDestination,
    destinationError,
    setDestinationError,
    selectedDates,
    setSelectedDates,
    dateError,
    setDateError,
    guests,
    setGuests,
    guestError,
    setGuestError,
    matchingDestinationSuggestions,
    activeFilterCount,
    filtersOpen,
    onOpenFilters,
    onSearch,
}: SearchFormProps) {
    const [destinationFocused, setDestinationFocused] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [monthYearPickerOpen, setMonthYearPickerOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const datePickerRef = useRef<HTMLDivElement>(null);

    /*
     * Close the calendar when focus moves elsewhere via a pointer click or when
     * Escape is pressed. Keeping the trigger and popup inside one ref prevents
     * clicks within the calendar/month-year picker from closing it prematurely.
     */
    useEffect(() => {
        if (!datePickerOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;

            if (target instanceof Node && !datePickerRef.current?.contains(target)) {
                setDatePickerOpen(false);
                setMonthYearPickerOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setDatePickerOpen(false);
                setMonthYearPickerOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [datePickerOpen]);

    const dateLabel = (() => {
        if (!selectedDates?.from) {
            return "Add dates";
        }

        if (!selectedDates.to) {
            return `${format(selectedDates.from, "MMM d, yyyy")} – Select check-out`;
        }

        return `${format(selectedDates.from, "MMM d")} – ${format(
            selectedDates.to,
            "MMM d, yyyy",
        )}`;
    })();

    const handleDateSelect = (range: DateRange | undefined) => {
        setSelectedDates(range);
        setDateError("");

        if (range?.from && range?.to) {
            setDatePickerOpen(false);
            setMonthYearPickerOpen(false);
        }
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSearch();
            }}
        >
            {/*
             * One unified search surface keeps the primary controls together.
             * Filters are available here before a search is submitted; sorting
             * remains beside the results because it only affects result order.
             */}
            <div className="w-full min-w-0 rounded-[14px] border border-[#BACBDF] bg-white shadow-[0_10px_28px_rgba(7,13,47,0.07)]">
                <div className="grid min-w-0 lg:grid-cols-[1.45fr_1fr_0.8fr_auto_auto] lg:items-stretch">
                    {/* Destination */}
                    <div
                        className={`relative min-w-0 rounded-t-[13px] px-4 py-3 transition lg:rounded-l-[13px] lg:rounded-tr-none lg:border-r lg:border-[#BACBDF] ${
                            destinationFocused ? "bg-[#E7EEF8]/35" : "bg-white"
                        } `}
                    >
                        <label
                            htmlFor="likehome-destination"
                            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#070D2F]"
                        >
                            Destination
                        </label>

                        <div className="relative">
                            <div
                                className={`relative border-b transition focus-within:border-[#4C79BD] ${
                                    destinationError
                                        ? "border-red-500"
                                        : "border-transparent"
                                }`}
                            >
                                <input
                                    id="likehome-destination"
                                    type="text"
                                    value={destination}
                                    onFocus={() => setDestinationFocused(true)}
                                    onBlur={() => setDestinationFocused(false)}
                                    onChange={(event) => {
                                        setDestination(event.target.value);
                                        setDestinationError("");
                                    }}
                                    onKeyDown={(event) => {
                                        /*
                                         * Tab accepts the first visible autocomplete
                                         * suggestion, then continues to the next field.
                                         * Enter is intentionally left alone so the form
                                         * searches exactly what is currently typed.
                                         */
                                        if (
                                            event.key === "Tab" &&
                                            matchingDestinationSuggestions.length > 0
                                        ) {
                                            setDestination(
                                                matchingDestinationSuggestions[0],
                                            );
                                            setDestinationError("");
                                            setDestinationFocused(false);
                                        }

                                        if (event.key === "Escape") {
                                            setDestinationFocused(false);
                                        }
                                    }}
                                    placeholder="Where are you going?"
                                    autoComplete="off"
                                    aria-invalid={Boolean(destinationError)}
                                    aria-describedby={
                                        destinationError
                                            ? "likehome-destination-error"
                                            : undefined
                                    }
                                    className="relative z-10 w-full bg-transparent py-1 text-sm text-[#070D2F] outline-none placeholder:text-[#536383]"
                                />
                            </div>

                            {/*
                             * TODO(API): Replace these mock-data suggestions with
                             * backend-powered destination autocomplete.
                             */}
                            {destinationFocused &&
                                matchingDestinationSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[8px] border border-[#BACBDF] bg-white py-1 shadow-lg">
                                        {matchingDestinationSuggestions.map((place) => (
                                            <button
                                                key={place}
                                                type="button"
                                                tabIndex={-1}
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onClick={() => {
                                                    setDestination(place);
                                                    setDestinationError("");
                                                    setDestinationFocused(false);
                                                }}
                                                className="block w-full px-4 py-3 text-left text-sm text-[#070D2F] transition hover:bg-[#E7EEF8]"
                                            >
                                                {place}
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>

                        {destinationError && (
                            <p
                                id="likehome-destination-error"
                                className="mt-1 text-xs text-red-600"
                            >
                                {destinationError}
                            </p>
                        )}
                    </div>

                    {/* Dates */}
                    <div
                        ref={datePickerRef}
                        className="relative min-w-0 border-t border-[#BACBDF] bg-white px-4 py-3 lg:border-l-0 lg:border-r lg:border-t-0"
                    >
                        <span
                            id="likehome-dates-label"
                            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#070D2F]"
                        >
                            Dates
                        </span>

                        <button
                            type="button"
                            aria-labelledby="likehome-dates-label"
                            aria-describedby={
                                dateError ? "likehome-dates-error" : undefined
                            }
                            aria-expanded={datePickerOpen}
                            aria-haspopup="dialog"
                            onClick={() => {
                                setDatePickerOpen((current) => !current);
                                setMonthYearPickerOpen(false);
                            }}
                            className={`w-full border-b bg-white py-1 text-left text-sm outline-none transition ${
                                dateError
                                    ? "border-red-500"
                                    : datePickerOpen
                                      ? "border-[#4C79BD]"
                                      : "border-transparent"
                            } ${
                                selectedDates?.from
                                    ? "text-[#070D2F]"
                                    : "text-[#536383]"
                            }`}
                        >
                            {dateLabel}
                        </button>

                        {dateError && (
                            <p
                                id="likehome-dates-error"
                                className="mt-1 text-xs text-red-600"
                            >
                                {dateError}
                            </p>
                        )}

                        {datePickerOpen && (
                            <div
                                role="dialog"
                                aria-label="Choose dates"
                                className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-[min(350px,calc(100vw-2rem))] -translate-x-1/2 rounded-[12px] border border-[#BACBDF] bg-white p-4 shadow-xl sm:left-0 sm:w-[350px] sm:max-w-[calc(100vw-3rem)] sm:translate-x-0"
                            >
                                <div className={inter.className}>
                                    <div className="relative mb-3 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMonthYearPickerOpen(
                                                    (current) => !current,
                                                )
                                            }
                                            className="text-lg font-semibold text-[#070D2F] transition hover:text-[#4C79BD]"
                                        >
                                            {format(calendarMonth, "MMMM yyyy")}
                                        </button>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                aria-label="Previous month"
                                                onClick={() =>
                                                    setCalendarMonth(
                                                        new Date(
                                                            calendarMonth.getFullYear(),
                                                            calendarMonth.getMonth() - 1,
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
                                                            calendarMonth.getMonth() + 1,
                                                            1,
                                                        ),
                                                    )
                                                }
                                                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-[#4C79BD] transition hover:bg-[#E7EEF8]"
                                            >
                                                ›
                                            </button>
                                        </div>

                                        {monthYearPickerOpen && (
                                            <div className="absolute left-0 top-11 z-30 w-full rounded-[10px] border border-[#BACBDF] bg-white p-4 shadow-lg">
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#536383]">
                                                    Month
                                                </p>

                                                <div className="grid grid-cols-3 gap-2">
                                                    {MONTH_NAMES.map((month, index) => (
                                                        <button
                                                            key={month}
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
                                                                    : "bg-white text-[#070D2F] hover:bg-[#E7EEF8]"
                                                            }`}
                                                        >
                                                            {month.slice(0, 3)}
                                                        </button>
                                                    ))}
                                                </div>

                                                <p className="mb-2 mt-4 border-t border-[#BACBDF] pt-4 text-xs font-semibold uppercase tracking-wide text-[#536383]">
                                                    Year
                                                </p>

                                                <div className="grid max-h-28 grid-cols-3 gap-2 overflow-y-auto">
                                                    {Array.from(
                                                        { length: 6 },
                                                        (_, index) =>
                                                            new Date().getFullYear() +
                                                            index,
                                                    ).map((year) => (
                                                        <button
                                                            key={year}
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
                                                                    : "bg-white text-[#070D2F] hover:bg-[#E7EEF8]"
                                                            }`}
                                                        >
                                                            {year}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/*
                                     * TODO(BACKEND): The selected range is already
                                     * collected here. The availability endpoint should
                                     * use check-in/check-out to return only available stays.
                                     */}
                                    <DayPicker
                                        mode="range"
                                        min={1}
                                        month={calendarMonth}
                                        onMonthChange={setCalendarMonth}
                                        selected={selectedDates}
                                        onSelect={handleDateSelect}
                                        numberOfMonths={1}
                                        hideNavigation
                                        disabled={{ before: new Date() }}
                                        className="likehome-calendar"
                                    />
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t border-[#BACBDF] pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedDates(undefined);
                                            setDateError("");
                                        }}
                                        className="text-sm font-semibold text-[#536383] transition hover:text-[#4C79BD]"
                                    >
                                        Clear dates
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDatePickerOpen(false);
                                            setMonthYearPickerOpen(false);
                                        }}
                                        className="rounded-[6px] bg-[#4C79BD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#070D2F]"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Guests */}
                    <div className="min-w-0 border-t border-[#BACBDF] bg-white px-4 py-3 lg:border-r lg:border-t-0">
                        <label
                            htmlFor="likehome-guests"
                            className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#070D2F]"
                        >
                            Guests
                        </label>

                        <input
                            id="likehome-guests"
                            type="text"
                            inputMode="numeric"
                            value={guests}
                            onChange={(event) => {
                                const value = event.target.value;

                                if (/^\d*$/.test(value)) {
                                    setGuests(value);
                                    setGuestError("");
                                }
                            }}
                            placeholder="Add guests"
                            aria-invalid={Boolean(guestError)}
                            aria-describedby={
                                guestError ? "likehome-guests-error" : undefined
                            }
                            className={`w-full border-b bg-white py-1 text-sm text-[#070D2F] outline-none placeholder:text-[#536383] focus:border-[#4C79BD] ${
                                guestError
                                    ? "border-red-500"
                                    : "border-transparent"
                            }`}
                        />

                        {guestError && (
                            <p
                                id="likehome-guests-error"
                                className="mt-1 text-xs text-red-600"
                            >
                                {guestError}
                            </p>
                        )}
                    </div>

                    {/*
                     * Filter access lives in the primary search controls so users
                     * can narrow browsing results before submitting a destination
                     * search. The modal groups related controls into collapsible
                     * sections so the full filter set is still available without
                     * overwhelming the primary search surface.
                     */}
                    <div className="min-w-0 border-t border-[#BACBDF] bg-white p-2 lg:border-r lg:border-t-0">
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={filtersOpen}
                            onClick={onOpenFilters}
                            className="flex h-full min-h-12 w-full items-center justify-center gap-2 rounded-[9px] px-4 text-sm font-semibold text-[#070D2F] transition hover:bg-[#E7EEF8] hover:text-[#4C79BD]"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            >
                                <path d="M4 7h16" />
                                <path d="M7 12h10" />
                                <path d="M10 17h4" />
                            </svg>

                            <span>Filters</span>

                            {activeFilterCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4C79BD] px-1.5 text-[11px] text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search */}
                    <div className="min-w-0 rounded-b-[13px] border-t border-[#BACBDF] bg-white p-2 lg:rounded-bl-none lg:rounded-r-[13px] lg:border-t-0">
                        <button
                            type="submit"
                            className="h-full min-h-12 w-full rounded-[9px] bg-[#4C79BD] px-7 text-sm font-semibold text-white transition hover:bg-[#070D2F]"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
