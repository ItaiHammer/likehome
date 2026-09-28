"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { dmSerif } from "../lib/fonts";
import type { DestinationScope, PopularDestination } from "../types";
import DestinationCard from "./DestinationCard";

type PopularDestinationsProps = {
    destinations: PopularDestination[];
    destinationScope: DestinationScope;
    onScopeChange: (scope: DestinationScope) => void;
    onDestinationSelect: (searchValue: string) => void;
};

const scopeOptions: { value: DestinationScope; label: string }[] = [
    { value: "nearby", label: "Near you" },
    { value: "national", label: "National" },
    { value: "international", label: "International" },
];

const ROTATION_INTERVAL_MS = 5200;
const SLIDE_DURATION_MS = 750;
const CARD_GAP_PX = 16;

function getVisibleDestinationCount(width: number) {
    // Phone widths get one full card instead of three narrow cards. Small
    // tablets / landscape phones get two; larger layouts keep three.
    if (width < 520) {
        return 1;
    }

    if (width < 900) {
        return 2;
    }

    return 3;
}

export default function PopularDestinations({
    destinations,
    destinationScope,
    onScopeChange,
    onDestinationSelect,
}: PopularDestinationsProps) {
    const viewportRef = useRef<HTMLDivElement>(null);

    const [visibleCount, setVisibleCount] = useState(3);
    const [slideIndex, setSlideIndex] = useState(0);
    const [slideStep, setSlideStep] = useState(0);
    const [transitionEnabled, setTransitionEnabled] = useState(true);
    const [paused, setPaused] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    /*
     * TODO(API): "Near you" is currently a mock destination group, not a live
     * location-based result. When location support is added, confirm whether the
     * app should use an account location, browser permission, or a backend value.
     *
     * TODO(BACKEND): Popular destination order and image data should come from
     * the API. This temporary carousel rotates mock destinations while keeping
     * every destination card directly clickable.
     */
    const carouselDestinations = useMemo(() => {
        if (destinations.length <= visibleCount) {
            return destinations;
        }

        // Duplicate only as many cards as are currently visible so the final
        // slide can loop smoothly on desktop, tablet, and phone widths.
        return [...destinations, ...destinations.slice(0, visibleCount)];
    }, [destinations, visibleCount]);

    useEffect(() => {
        setSlideIndex(0);
        setTransitionEnabled(true);
    }, [destinationScope, destinations, visibleCount]);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        const updateMotionPreference = () => {
            setPrefersReducedMotion(mediaQuery.matches);
        };

        updateMotionPreference();
        mediaQuery.addEventListener("change", updateMotionPreference);

        return () =>
            mediaQuery.removeEventListener("change", updateMotionPreference);
    }, []);

    useEffect(() => {
        const updateCarouselSizing = () => {
            const viewportWidth = viewportRef.current?.clientWidth ?? 0;

            if (viewportWidth === 0) {
                return;
            }

            const nextVisibleCount = getVisibleDestinationCount(viewportWidth);
            setVisibleCount(nextVisibleCount);

            const cardWidth =
                (viewportWidth - CARD_GAP_PX * (nextVisibleCount - 1)) /
                nextVisibleCount;

            setSlideStep(cardWidth + CARD_GAP_PX);
        };

        updateCarouselSizing();

        const resizeObserver = new ResizeObserver(updateCarouselSizing);
        if (viewportRef.current) {
            resizeObserver.observe(viewportRef.current);
        }

        window.addEventListener("resize", updateCarouselSizing);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateCarouselSizing);
        };
    }, []);

    useEffect(() => {
        if (
            paused ||
            prefersReducedMotion ||
            destinations.length <= visibleCount ||
            slideStep === 0
        ) {
            return;
        }

        const interval = window.setInterval(() => {
            setTransitionEnabled(true);
            setSlideIndex((current) => current + 1);
        }, ROTATION_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [
        destinations.length,
        paused,
        prefersReducedMotion,
        slideStep,
        visibleCount,
    ]);

    const handleTransitionEnd = () => {
        if (slideIndex < destinations.length) {
            return;
        }

        setTransitionEnabled(false);
        setSlideIndex(0);

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                setTransitionEnabled(true);
            });
        });
    };

    return (
        <section className="mb-8">
            <div>
                <h2 className={`${dmSerif.className} text-3xl`}>
                    Popular destinations
                </h2>
                <p className="mt-1 text-sm text-[#536383]">
                    Browse popular places nearby, across the country, or around
                    the world.
                </p>
            </div>

            <div className="mb-5 mt-5 flex flex-wrap gap-3">
                {scopeOptions.map(({ value, label }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onScopeChange(value)}
                        className={`rounded-[6px] border px-4 py-2 text-sm font-semibold transition ${
                            destinationScope === value
                                ? "border-[#4C79BD] bg-[#4C79BD] text-white"
                                : "border-[#BACBDF] bg-white text-[#070D2F] hover:border-[#4C79BD] hover:bg-[#E7EEF8]"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div
                ref={viewportRef}
                className="overflow-hidden"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocusCapture={() => setPaused(true)}
                onBlurCapture={() => setPaused(false)}
                aria-label="Popular destinations carousel"
            >
                <div
                    className="flex gap-4"
                    onTransitionEnd={handleTransitionEnd}
                    style={{
                        transform: `translate3d(-${slideIndex * slideStep}px, 0, 0)`,
                        transition:
                            transitionEnabled && !prefersReducedMotion
                                ? `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                                : "none",
                    }}
                >
                    {carouselDestinations.map((place, index) => (
                        <div
                            key={`${place.name}-${index}`}
                            className="min-w-0 shrink-0"
                            style={{
                                width: `calc((100% - ${
                                    CARD_GAP_PX * (visibleCount - 1)
                                }px) / ${visibleCount})`,
                            }}
                        >
                            <DestinationCard
                                place={place}
                                imageIndex={index % destinations.length}
                                onClick={() =>
                                    onDestinationSelect(place.searchValue)
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
