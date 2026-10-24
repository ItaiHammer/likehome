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
import type { Stay } from "../../_data/stays";

export type RecentComparisonStay = {
    stay: Stay;
    viewedAt: string;
};

type ComparisonFlowProps = {
    currentStay: Stay;
    recentStays: RecentComparisonStay[];
};

const COMPARISON_AMENITIES = [
    { label: "Parking", source: "Parking" },
    { label: "Pool", source: "Pool" },
    { label: "Kitchen", source: "Kitchen" },
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
] as const;

function startingPrice(stay: Stay) {
    const available = stay.rooms.filter(
        (room) => !room.soldOut,
    );

    if (available.length === 0) {
        return null;
    }

    return Math.min(
        ...available.map((room) => room.nightly),
    );
}

function formatPrice(price: number) {
    return price.toLocaleString("en-US", {
        maximumFractionDigits: 0,
    });
}

function maxGuests(stay: Stay) {
    if (stay.rooms.length === 0) {
        return null;
    }

    return Math.max(
        ...stay.rooms.map((room) => room.sleeps),
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
    stay: Stay;
    className: string;
}) {
    const photo = stay.photos?.find(Boolean);

    if (photo) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={photo}
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
    stay: Stay;
}) {
    const price = startingPrice(stay);
    const guests = maxGuests(stay);
    const rating = formatRating(stay.rating);

    return (
        <section className="mt-7">
            <div className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-4 sm:flex-row sm:items-center">
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

                    {(rating || guests !== null) && (
                        <p className="mt-1 text-sm text-slate">
                            {rating && <>★ {rating}</>}

                            {rating && guests !== null && (
                                <span className="mx-2">·</span>
                            )}

                            {guests !== null && (
                                <>Up to {guests} guests</>
                            )}
                        </p>
                    )}
                </div>

                {price !== null && (
                    <div className="shrink-0 sm:min-w-36 sm:text-right">
                        <p className="text-xs text-slate">
                            From
                        </p>

                        <p className="mt-1 text-lg font-semibold text-ink">
                            ${formatPrice(price)} / night
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

function RecentStayRow({
                           item,
                           selected,
                           disabled,
                           onToggle,
                       }: {
    item: RecentComparisonStay;
    selected: boolean;
    disabled: boolean;
    onToggle: () => void;
}) {
    const { stay } = item;

    const price = startingPrice(stay);
    const guests = maxGuests(stay);
    const rating = formatRating(stay.rating);

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
                            <span className="mx-2">·</span>
                            ★ {rating}
                        </>
                    )}

                    {guests !== null && (
                        <>
                            <span className="mx-2">·</span>
                            Up to {guests} guests
                        </>
                    )}
                </p>

                <p className="mt-1 text-xs text-slate">
                    Recently viewed
                </p>
            </div>

            {price !== null && (
                <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs text-slate">
                        From
                    </p>

                    <p className="mt-1 whitespace-nowrap font-semibold text-ink">
                        ${formatPrice(price)} / night
                    </p>
                </div>
            )}
        </label>
    );
}

function amenityStatus(
    stay: Stay,
    source: string,
) {
    const offer = stay.offers?.find(
        (item) =>
            item.label === source,
    );

    if (offer) {
        return offer.someRooms
            ? "Some rooms"
            : "Available";
    }

    if (stay.tags.includes(source)) {
        return "Available";
    }

    return "—";
}

function ComparisonCard({
                            stay,
                            removable,
                            onRemove,
                        }: {
    stay: Stay;
    removable?: boolean;
    onRemove?: () => void;
}) {
    const price = startingPrice(stay);
    const guests = maxGuests(stay);
    const rating = formatRating(stay.rating);

    const goodFor =
        GOOD_FOR_ORDER.filter((item) =>
            stay.goodFor?.includes(item),
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
                            onClick={onRemove}
                            className="text-xs font-medium text-blue hover:text-blue-dark"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {/* Property + starting price */}
            <div className="flex min-w-0 flex-col justify-center gap-2 py-2 sm:flex-row sm:items-center sm:justify-between lg:py-1">
                <div className="min-w-0 flex-1 pr-3">
                    <h2
                        className="line-clamp-2 text-lg font-semibold leading-snug text-ink"
                        title={stay.name}
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

                {price !== null && (
                    <div className="shrink-0 sm:text-right">
                        <p className="text-xs text-slate">
                            From
                        </p>

                        <p className="mt-1 whitespace-nowrap text-lg font-semibold text-ink">
                            ${formatPrice(price)} / night
                        </p>
                    </div>
                )}
            </div>

            {/* Guests */}
            <div className="flex min-w-0 items-center justify-between border-t border-edge py-4 lg:py-0">
        <span className="text-base text-slate">
          Guests
        </span>

                <span className="text-base font-semibold text-ink">
          {guests !== null
              ? `Up to ${guests}`
              : "—"}
        </span>
            </div>

            {/* Good for */}
            <div className="flex min-w-0 flex-col justify-center border-t border-edge py-4 lg:py-2">
                <h3 className="text-base font-semibold text-ink">
                    Good for
                </h3>

                <div className="mt-3">
                    {goodFor.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {goodFor.map((item) => (
                                <span
                                    key={item}
                                    className="rounded-full border border-edge px-3 py-1 text-xs text-blue"
                                >
                  {item}
                </span>
                            ))}
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
                        (amenity) => {
                            const status =
                                amenityStatus(
                                    stay,
                                    amenity.source,
                                );

                            return (
                                <div
                                    key={amenity.label}
                                    className="flex min-w-0 items-center justify-between gap-3 text-sm"
                                >
                  <span className="min-w-0 truncate text-ink">
                    {amenity.label}
                  </span>

                                    <span className="shrink-0 text-slate">
                    {status ===
                    "Available" ? (
                        <span className="text-lg font-bold leading-none text-blue">
                        ✓
                      </span>
                    ) : status ===
                    "Some rooms" ? (
                        <span className="text-xs font-medium text-blue">
                        Some rooms
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
                    href={`/reserve/${stay.slug}`}
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
                               }: ComparisonFlowProps) {
    const router = useRouter();
    const searchParams =
        useSearchParams();

    const comparedSlugs =
        useMemo(() => {
            const slugs =
                searchParams
                    .get("compare")
                    ?.split(",")
                    .filter(Boolean)
                    .slice(0, 2) ?? [];

            return slugs.filter(
                (slug) =>
                    recentStays.some(
                        (item) =>
                            item.stay.slug ===
                            slug,
                    ),
            );
        }, [
            searchParams,
            recentStays,
        ]);

    const comparing =
        searchParams.has("compare") &&
        comparedSlugs.length > 0;

    const [
        selectedSlugs,
        setSelectedSlugs,
    ] = useState<string[]>([]);

    const activeSlugs = comparing
        ? comparedSlugs
        : selectedSlugs;

    const selectedStays =
        useMemo(
            () =>
                activeSlugs
                    .map(
                        (slug) =>
                            recentStays.find(
                                (item) =>
                                    item.stay.slug ===
                                    slug,
                            )?.stay,
                    )
                    .filter(
                        (
                            stay,
                        ): stay is Stay =>
                            !!stay,
                    ),
            [
                recentStays,
                activeSlugs,
            ],
        );

    function toggleStay(
        slug: string,
    ) {
        setSelectedSlugs(
            (current) => {
                if (
                    current.includes(slug)
                ) {
                    return current.filter(
                        (item) =>
                            item !== slug,
                    );
                }

                if (
                    current.length >= 2
                ) {
                    return current;
                }

                return [
                    ...current,
                    slug,
                ];
            },
        );
    }

    function startComparison() {
        if (
            selectedSlugs.length === 0
        ) {
            return;
        }

        const params =
            new URLSearchParams(
                searchParams.toString(),
            );

        params.set(
            "compare",
            selectedSlugs.join(","),
        );

        router.push(
            `?${params.toString()}`,
        );
    }

    function changeSelection() {
        setSelectedSlugs(
            comparedSlugs,
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
        slug: string,
    ) {
        const next =
            comparedSlugs.filter(
                (item) =>
                    item !== slug,
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
                        {currentStay.name} and{" "}
                        {
                            selectedStays.length
                        }{" "}
                        recently viewed{" "}
                        {selectedStays.length ===
                        1
                            ? "stay"
                            : "stays"}
                        . Starting prices are
                        shown per night.
                    </p>
                </header>

                <div
                    className={`mt-7 grid min-w-0 grid-cols-1 gap-4 ${
                        stays.length === 2
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
                                key={stay.slug}
                                stay={stay}
                                removable={
                                    index !== 0
                                }
                                onRemove={
                                    index === 0
                                        ? undefined
                                        : () =>
                                            removeStay(
                                                stay.slug,
                                            )
                                }
                            />
                        ),
                    )}
                </div>

                <p
                    className={`mt-3 text-xs text-slate ${
                        stays.length === 2
                            ? "mx-auto w-full max-w-4xl"
                            : ""
                    }`}
                >
                    — Amenity not offered
                </p>
            </>
        );
    }

    const maxSelected =
        selectedSlugs.length >= 2;

    return (
        <>
            <Link
                href={`/reserve/${currentStay.slug}`}
                className="text-sm font-medium text-blue hover:text-blue-dark"
            >
                ← Back to{" "}
                {currentStay.name}
            </Link>

            <header className="mt-4 flex flex-col gap-[15px]">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue">
                    FIND YOUR PERFECT STAY
                </p>

                <h1 className="font-serif text-4xl leading-none text-ink sm:text-5xl">
                    Which stay feels like
                    home?
                </h1>

                <p className="text-slate">
                    Compare{" "}
                    {currentStay.name} with
                    up to 2 recently viewed
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
                            Recently viewed
                        </h2>

                        <p className="text-sm text-slate">
                            Most recently viewed
                            first
                        </p>
                    </div>

                    <p className="text-sm text-slate">
                        {recentStays.length}{" "}
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
                            (item) => {
                                const selected =
                                    selectedSlugs.includes(
                                        item.stay.slug,
                                    );

                                return (
                                    <RecentStayRow
                                        key={
                                            item.stay
                                                .slug
                                        }
                                        item={item}
                                        selected={
                                            selected
                                        }
                                        disabled={
                                            !selected &&
                                            maxSelected
                                        }
                                        onToggle={() =>
                                            toggleStay(
                                                item.stay
                                                    .slug,
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
                            No recently viewed
                            stays yet
                        </h3>

                        <p className="mt-2 text-sm text-slate">
                            View another stay
                            first and it will
                            appear here for
                            comparison.
                        </p>

                        <Link
                            href="/search"
                            className="mt-5 inline-flex text-sm font-semibold text-blue hover:text-blue-dark"
                        >
                            Explore stays →
                        </Link>
                    </div>
                )}
            </section>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate">
                    {selectedSlugs.length >
                    0 ? (
                        <>
                            <p>
                                {
                                    selectedSlugs.length
                                }{" "}
                                {selectedSlugs.length ===
                                1
                                    ? "stay"
                                    : "stays"}{" "}
                                selected ·{" "}
                                {currentStay.name} is
                                included
                            </p>

                            {maxSelected && (
                                <p className="mt-1 text-xs">
                                    Uncheck a stay to
                                    choose another.
                                </p>
                            )}
                        </>
                    ) : (
                        <p>
                            Select 1 or 2 stays
                            to compare with{" "}
                            {currentStay.name}.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-5">
                    {selectedSlugs.length >
                        0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedSlugs(
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
                            selectedSlugs.length ===
                            0
                        }
                        onClick={
                            startComparison
                        }
                        className="min-h-11 rounded-lg bg-blue px-6 py-3 text-sm font-semibold text-on-blue transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:bg-[#E6EBF3] disabled:text-[#536383]"
                    >
                        {selectedSlugs.length ===
                        0
                            ? "Compare stays"
                            : `Compare ${
                                selectedSlugs.length +
                                1
                            } stays`}
                    </button>
                </div>
            </div>
        </>
    );
}