"use client";

import Link from "next/link";
import {
    useRouter,
    useSearchParams,
} from "next/navigation";
import {
    useMemo,
    useState,
} from "react";
import type {ComparisonListing} from "@/lib/comparison";

type ComparisonFlowProps = {
    currentStay: ComparisonListing;
    recentStays: ComparisonListing[];
    signedIn: boolean;
};

const COMPARISON_AMENITIES = [
    {
        label: "Parking",
        source: "Parking",
    },
    {
        label: "Pool",
        source: "Pool",
    },
    {
        label: "Kitchen",
        source: "Kitchen",
    },
    {
        label: "Laundry",
        source: "Washer & Dryer",
    },
] as const;

const GOOD_FOR_ORDER = [
    "Families",
    "Kids",
    "Couples",
    "Friends",
    "Pets",
] as const;

function formatPrice(price: number) {
    return price.toLocaleString(
        "en-US",
        {
            maximumFractionDigits: 0,
        },
    );
}

function formatRating(
    rating: number | null,
) {
    if (rating === null) {
        return null;
    }

    return Number.isInteger(rating)
        ? String(rating)
        : rating.toFixed(1);
}

function StayPhoto({
                       stay,
                       className,
                   }: {
    stay: ComparisonListing;
    className: string;
}) {
    if (stay.photo) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={stay.photo}
                alt={`${stay.name} photo`}
                className={className}
            />
        );
    }

    return (
        <div
            className={`${className} relative overflow-hidden bg-blue/10`}
            aria-hidden
        >
            <span className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-blue/50">
                {stay.name.charAt(0)}
            </span>
        </div>
    );
}

function CurrentStaySummary({
                                stay,
                            }: {
    stay: ComparisonListing;
}) {
    const rating =
        formatRating(stay.rating);

    return (
        <section className="mt-7">
            <div
                className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4 sm:flex-row sm:items-center">
                <StayPhoto
                    stay={stay}
                    className="h-28 w-full rounded-lg object-cover sm:w-40"
                />

                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-ink">
                        {stay.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate">
                        {stay.location}
                    </p>

                    <p className="mt-1 text-sm text-slate">
                        {rating && (
                            <>
                                ★ {rating}
                                <span className="mx-2">
                                    ·
                                </span>
                            </>
                        )}

                        Up to{" "}
                        {stay.sleepsUpTo}{" "}
                        guests
                    </p>
                </div>

                <div className="shrink-0 sm:min-w-36 sm:text-right">
                    <p className="text-xs text-slate">
                        From
                    </p>

                    <p className="mt-1 text-lg font-semibold text-ink">
                        $
                        {formatPrice(
                            stay.priceFrom,
                        )}{" "}
                        / night
                    </p>
                </div>
            </div>
        </section>
    );
}

function RecentStayRow({
                           stay,
                           selected,
                           disabled,
                           onToggle,
                       }: {
    stay: ComparisonListing;
    selected: boolean;
    disabled: boolean;
    onToggle: () => void;
}) {
    const rating =
        formatRating(stay.rating);

    return (
        <label
            className={`flex min-h-[96px] items-center gap-4 border-b border-edge px-4 py-3 transition-colors last:border-b-0 ${
                selected
                    ? "bg-blue/5"
                    : "bg-surface"
            } ${
                disabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-blue/5"
            }`}
        >
            <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={onToggle}
                className="h-4 w-4 shrink-0 accent-blue"
            />

            <StayPhoto
                stay={stay}
                className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
            />

            <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-ink">
                    {stay.name}
                </h3>

                <p className="mt-1 truncate text-sm text-slate">
                    {stay.location}

                    {rating && (
                        <>
                            <span className="mx-2">
                                ·
                            </span>
                            ★ {rating}
                        </>
                    )}

                    <span className="mx-2">
                        ·
                    </span>

                    Up to{" "}
                    {stay.sleepsUpTo}{" "}
                    guests
                </p>

                <p className="mt-1 text-xs text-slate">
                    Recently viewed
                </p>
            </div>

            <div className="hidden shrink-0 text-right sm:block">
                <p className="text-xs text-slate">
                    From
                </p>

                <p className="mt-1 whitespace-nowrap font-semibold text-ink">
                    $
                    {formatPrice(
                        stay.priceFrom,
                    )}{" "}
                    / night
                </p>
            </div>
        </label>
    );
}

function ComparisonCard({
                            stay,
                            removable,
                            onRemove,
                            reserveHref,
                        }: {
    stay: ComparisonListing;
    removable?: boolean;
    onRemove?: () => void;
    reserveHref: string;
}) {
    const rating =
        formatRating(stay.rating);

    const goodFor =
        GOOD_FOR_ORDER.filter(
            (item) =>
                stay.goodFor.includes(
                    item,
                ),
        );

    return (
        <article
            className="
                grid min-w-0 overflow-hidden
                grid-rows-[auto_auto_auto_auto_auto_auto]
                rounded-xl border border-edge bg-surface
                p-4 pb-6
                sm:p-5 sm:pb-7
                lg:grid-rows-[auto_110px_66px_100px_142px_48px]
            "
        >
            {/* Photo + action */}
            <div className="min-w-0">
                <StayPhoto
                    stay={stay}
                    className="aspect-[16/7] w-full rounded-lg object-cover"
                />

                <div className="mt-3 flex h-5 items-center justify-end">
                    {removable && (
                        <button
                            type="button"
                            onClick={
                                onRemove
                            }
                            className="text-xs font-medium text-blue hover:text-blue-dark"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {/* Property + starting price */}
            <div
                className="flex min-w-0 flex-col justify-center gap-2 py-2 sm:flex-row sm:items-center sm:justify-between lg:py-1">
                <div className="min-w-0 flex-1 pr-3">
                    <h2
                        className="line-clamp-2 text-lg font-semibold leading-snug text-ink"
                        title={
                            stay.name
                        }
                    >
                        {stay.name}
                    </h2>

                    <p className="mt-1 truncate text-sm text-slate">
                        {stay.location}
                    </p>

                    {rating && (
                        <p className="mb-2 mt-1 text-sm text-slate">
                            ★ {rating}
                        </p>
                    )}
                </div>

                <div className="shrink-0 sm:text-right">
                    <p className="text-xs text-slate">
                        From
                    </p>

                    <p className="mt-1 whitespace-nowrap text-lg font-semibold text-ink">
                        $
                        {formatPrice(
                            stay.priceFrom,
                        )}{" "}
                        / night
                    </p>
                </div>
            </div>

            {/* Guests */}
            <div className="flex min-w-0 items-center justify-between border-t border-edge py-4 lg:py-0">
                <span className="text-base text-slate">
                    Guests
                </span>

                <span className="text-base font-semibold text-ink">
                    Up to{" "}
                    {stay.sleepsUpTo}
                </span>
            </div>

            {/* Good for */}
            <div className="flex min-w-0 flex-col justify-center border-t border-edge py-4 lg:py-2">
                <h3 className="text-base font-semibold text-ink">
                    Good for
                </h3>

                <div className="mt-3">
                    {goodFor.length >
                    0 ? (
                        <div className="flex flex-wrap gap-2">
                            {goodFor.map(
                                (
                                    item,
                                ) => (
                                    <span
                                        key={
                                            item
                                        }
                                        className="rounded-full border border-edge px-3 py-1 text-xs text-blue"
                                    >
                                        {
                                            item
                                        }
                                    </span>
                                ),
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-slate">
                            —
                        </span>
                    )}
                </div>
            </div>

            {/* Amenities */}
            <div className="flex min-w-0 flex-col justify-center border-t border-edge py-5 lg:py-2">
                <h3 className="text-base font-semibold text-ink">
                    Amenities
                </h3>

                <div className="mt-3 grid min-w-0 grid-cols-2 gap-x-6 gap-y-3">
                    {COMPARISON_AMENITIES.map(
                        (
                            amenity,
                        ) => {
                            const status =
                                stay.amenities.find(
                                    (
                                        item,
                                    ) =>
                                        item.label ===
                                        amenity.source,
                                )
                                    ?.status ??
                                "not-offered";

                            return (
                                <div
                                    key={
                                        amenity.label
                                    }
                                    className="flex min-w-0 items-center justify-between gap-3 text-sm"
                                >
                                    <span className="min-w-0 truncate text-ink">
                                        {
                                            amenity.label
                                        }
                                    </span>

                                    <span className="shrink-0 text-slate">
                                        {status ===
                                        "available" ? (
                                            <span className="text-lg font-bold leading-none text-blue">
                                                ✓
                                            </span>
                                        ) : status ===
                                        "some-rooms" ? (
                                            <span className="text-xs font-medium text-blue">
                                                Some
                                                rooms
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </span>
                                </div>
                            );
                        },
                    )}
                </div>
            </div>

            {/* View stay */}
            <div className="flex min-w-0 items-end pt-2 lg:pt-1">
                <Link
                    href={
                        reserveHref
                    }
                    className="flex h-11 w-full items-center justify-center rounded-lg border border-edge text-sm font-semibold text-blue transition-colors hover:border-blue hover:bg-blue/5"
                >
                    View stay
                </Link>
            </div>
        </article>
    );
}

export function ComparisonFlow({
                                   currentStay,
                                   recentStays,
                                   signedIn,
                               }: ComparisonFlowProps) {
    const router = useRouter();
    const searchParams =
        useSearchParams();

    /*
     * Preserve the search context when returning to a stay.
     * Only the compare-specific parameter is removed.
     */
    function reserveHref(
        id: string,
    ) {
        const params =
            new URLSearchParams(
                searchParams.toString(),
            );

        params.delete("compare");

        const query =
            params.toString();

        return `/reserve/${id}${
            query
                ? `?${query}`
                : ""
        }`;
    }

    /*
     * Deduplicate before limiting the comparison to 2 alternatives.
     * This prevents ?compare=A,A from rendering the same stay twice.
     */
    const comparedIds =
        useMemo(() => {
            const ids = [
                ...new Set(
                    searchParams
                        .get(
                            "compare",
                        )
                        ?.split(",")
                        .filter(
                            Boolean,
                        ) ?? [],
                ),
            ].slice(0, 2);

            return ids.filter(
                (id) =>
                    recentStays.some(
                        (
                            stay,
                        ) =>
                            stay.id ===
                            id,
                    ),
            );
        }, [
            searchParams,
            recentStays,
        ]);

    const comparing =
        searchParams.has(
            "compare",
        ) &&
        comparedIds.length > 0;

    const [
        selectedIds,
        setSelectedIds,
    ] = useState<string[]>([]);

    const activeIds =
        comparing
            ? comparedIds
            : selectedIds;

    const selectedStays =
        useMemo(
            () =>
                activeIds
                    .map((id) =>
                        recentStays.find(
                            (
                                stay,
                            ) =>
                                stay.id ===
                                id,
                        ),
                    )
                    .filter(
                        (
                            stay,
                        ): stay is ComparisonListing =>
                            !!stay,
                    ),
            [
                recentStays,
                activeIds,
            ],
        );

    function toggleStay(
        id: string,
    ) {
        setSelectedIds(
            (current) => {
                if (
                    current.includes(
                        id,
                    )
                ) {
                    return current.filter(
                        (
                            item,
                        ) =>
                            item !==
                            id,
                    );
                }

                if (
                    current.length >=
                    2
                ) {
                    return current;
                }

                return [
                    ...current,
                    id,
                ];
            },
        );
    }

    function startComparison() {
        if (
            selectedIds.length ===
            0
        ) {
            return;
        }

        const params =
            new URLSearchParams(
                searchParams.toString(),
            );

        params.set(
            "compare",
            selectedIds.join(","),
        );

        router.push(
            `?${params.toString()}`,
        );
    }

    function changeSelection() {
        setSelectedIds(
            comparedIds,
        );

        const params =
            new URLSearchParams(
                searchParams.toString(),
            );

        params.delete("compare");

        const query =
            params.toString();

        router.push(
            query
                ? `?${query}`
                : "?",
        );
    }

    function removeStay(
        id: string,
    ) {
        const next =
            comparedIds.filter(
                (item) =>
                    item !== id,
            );

        if (next.length === 0) {
            changeSelection();
            return;
        }

        const params =
            new URLSearchParams(
                searchParams.toString(),
            );

        params.set(
            "compare",
            next.join(","),
        );

        router.replace(
            `?${params.toString()}`,
        );
    }

    if (comparing) {
        const stays = [
            currentStay,
            ...selectedStays,
        ];

        return (
            <>
                <button
                    type="button"
                    onClick={
                        changeSelection
                    }
                    className="text-sm font-medium text-blue hover:text-blue-dark"
                >
                    ← Change selection
                </button>

                <header className="mt-4 flex flex-col gap-[15px]">
                    <h1 className="font-serif text-4xl leading-none text-ink sm:text-5xl">
                        Compare stays
                    </h1>

                    <p className="max-w-4xl text-slate">
                        {
                            currentStay.name
                        }{" "}
                        and{" "}
                        {
                            selectedStays.length
                        }{" "}
                        recently viewed{" "}
                        {selectedStays.length ===
                        1
                            ? "stay"
                            : "stays"}
                        . Starting
                        prices are shown
                        per night.
                    </p>
                </header>

                <div
                    className={`mt-7 grid min-w-0 grid-cols-1 gap-4 ${
                        stays.length ===
                        2
                            ? "mx-auto w-full max-w-4xl md:grid-cols-2"
                            : "lg:grid-cols-3"
                    }`}
                >
                    {stays.map(
                        (
                            stay,
                            index,
                        ) => (
                            <ComparisonCard
                                key={
                                    stay.id
                                }
                                stay={
                                    stay
                                }
                                removable={
                                    index !==
                                    0
                                }
                                onRemove={
                                    index ===
                                    0
                                        ? undefined
                                        : () =>
                                            removeStay(
                                                stay.id,
                                            )
                                }
                                reserveHref={reserveHref(
                                    stay.id,
                                )}
                            />
                        ),
                    )}
                </div>

                <p
                    className={`mt-3 text-xs text-slate ${
                        stays.length ===
                        2
                            ? "mx-auto w-full max-w-4xl"
                            : ""
                    }`}
                >
                    — Amenity not
                    offered
                </p>
            </>
        );
    }

    const maxSelected =
        selectedIds.length >= 2;

    return (
        <>
            <Link
                href={reserveHref(
                    currentStay.id,
                )}
                className="text-sm font-medium text-blue hover:text-blue-dark"
            >
                ← Back to{" "}
                {currentStay.name}
            </Link>

            <header className="mt-4 flex flex-col gap-[15px]">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue">
                    FIND YOUR PERFECT
                    STAY
                </p>

                <h1 className="font-serif text-4xl leading-none text-ink sm:text-5xl">
                    Which stay feels
                    like home?
                </h1>

                <p className="text-slate">
                    Compare{" "}
                    {currentStay.name}{" "}
                    with up to 2
                    recently viewed
                    stays.
                </p>
            </header>

            <CurrentStaySummary
                stay={currentStay}
            />

            <section className="mt-7">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h2 className="font-serif text-3xl text-ink">
                            Recently
                            viewed
                        </h2>

                        <p className="text-sm text-slate">
                            Most recently
                            viewed first
                        </p>
                    </div>

                    <p className="text-sm text-slate">
                        {
                            recentStays.length
                        }{" "}
                        {recentStays.length ===
                        1
                            ? "stay"
                            : "stays"}
                    </p>
                </div>

                {recentStays.length >
                0 ? (
                    <div className="max-h-[29rem] overflow-y-auto rounded-xl border border-edge bg-surface">
                        {recentStays.map(
                            (
                                stay,
                            ) => {
                                const selected =
                                    selectedIds.includes(
                                        stay.id,
                                    );

                                return (
                                    <RecentStayRow
                                        key={
                                            stay.id
                                        }
                                        stay={
                                            stay
                                        }
                                        selected={
                                            selected
                                        }
                                        disabled={
                                            !selected &&
                                            maxSelected
                                        }
                                        onToggle={() =>
                                            toggleStay(
                                                stay.id,
                                            )
                                        }
                                    />
                                );
                            },
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-edge bg-surface px-6 py-10 text-center">
                        <h3 className="font-semibold text-ink">
                            {signedIn
                                ? "No recently viewed stays yet"
                                : "Sign in to see recently viewed stays"}
                        </h3>

                        <p className="mt-2 text-sm text-slate">
                            {signedIn
                                ? "View another stay first and it will appear here for comparison."
                                : "Recently viewed stays are saved to your account so you can come back and compare them."}
                        </p>

                        <Link
                            href={
                                signedIn
                                    ? "/search"
                                    : "/auth/login"
                            }
                            className="mt-5 inline-flex text-sm font-semibold text-blue hover:text-blue-dark"
                        >
                            {signedIn
                                ? "Explore stays →"
                                : "Sign in →"}
                        </Link>
                    </div>
                )}
            </section>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate">
                    {selectedIds.length >
                    0 ? (
                        <>
                            <p>
                                {
                                    selectedIds.length
                                }
                                /2 stays
                                selected ·{" "}
                                {
                                    currentStay.name
                                }{" "}
                                is included
                            </p>

                            {maxSelected && (
                                <p className="mt-1 text-xs">
                                    Uncheck a
                                    stay to
                                    choose
                                    another.
                                </p>
                            )}
                        </>
                    ) : (
                        <p>
                            0/2 stays
                            selected ·
                            Select at least
                            1 stay to
                            compare.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-5">
                    {selectedIds.length >
                        0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedIds(
                                        [],
                                    )
                                }
                                className="min-h-10 px-2 text-sm font-medium text-blue hover:text-blue-dark"
                            >
                                Cancel
                            </button>
                        )}

                    <button
                        type="button"
                        disabled={
                            selectedIds.length ===
                            0
                        }
                        onClick={
                            startComparison
                        }
                        className="min-h-11 rounded-lg bg-blue px-6 py-3 text-sm font-semibold text-on-blue transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:bg-[#E6EBF3] disabled:text-[#536383]"
                    >
                        {selectedIds.length ===
                        0
                            ? "Compare stays"
                            : `Compare ${
                                selectedIds.length +
                                1
                            } stays`}
                    </button>
                </div>
            </div>
        </>
    );
}