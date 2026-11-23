import type { PromotionCampaign } from "./PromotionsClient";

export interface PropertyOption {
    id: string;
    name: string;
    location: string;
    roomType: string;
    rate: number;
}

export const SAMPLE_PROPERTIES: PropertyOption[] = [
    {
        id: "harbor-house",
        name: "Harbor House",
        location: "Monterey, California",
        roomType: "Coastal king",
        rate: 189,
    },
    {
        id: "pacific-terrace",
        name: "Pacific Terrace",
        location: "Santa Cruz, California",
        roomType: "Oceanfront suite",
        rate: 220,
    },
];

export const SAMPLE_CAMPAIGNS: PromotionCampaign[] = [
    {
        id: "sample-promo-1",
        propertyId: "harbor-house",
        propertyName: "Harbor House",
        propertyLocation: "Monterey, California",
        category: "Room openings",
        campaignName: "December coastal escape",
        audienceLabel: "Past guests who opted in · 2 eligible customers",
        subject: "A coastal escape is waiting at Harbor House",
        headline: "Your next coastal escape",
        message:
            "A few Coastal king rooms are open for Dec 6–10. Come back to Monterey and enjoy 10% off our standard nightly room rate. We would love to welcome you again.",
        roomType: "Coastal king",
        standardRate: 189,
        discountPercent: 10,
        firstEligibleNight: "Dec 6, 2026",
        lastEligibleNight: "Dec 9, 2026",
        bookByDate: "Dec 5",
        sendTime: "Dec 1, 2026 · 9:00 AM Pacific",
        status: "Draft",
        updatedAt: "2d ago",
    },
    {
        id: "sample-promo-2",
        propertyId: "pacific-terrace",
        propertyName: "Pacific Terrace",
        propertyLocation: "Santa Cruz, California",
        category: "Deal",
        campaignName: "Midweek winter getaway",
        audienceLabel: "Repeat guests who opted in · 1 eligible customer",
        subject: "15% off oceanfront stays at Pacific Terrace",
        headline: "Enjoy 15% off your stay",
        message:
            "Treat yourself to a quiet midweek oceanfront escape in Santa Cruz with 15% off our standard suite rate.",
        roomType: "Oceanfront suite",
        standardRate: 220,
        discountPercent: 15,
        firstEligibleNight: "Jan 11, 2027",
        lastEligibleNight: "Jan 15, 2027",
        bookByDate: "Jan 5",
        sendTime: "Jan 2, 2027 · 9:00 AM Pacific",
        status: "Scheduled",
        updatedAt: "5d ago",
    },
];