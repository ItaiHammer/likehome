"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SAMPLE_PROPERTIES, type PropertyOption } from "./mock-data";

export interface PromotionCampaign {
    id: string;
    propertyId: string;
    propertyName: string;
    propertyLocation: string;
    category: "Room openings" | "Deal" | "Hotel news";
    campaignName: string;
    audienceLabel: string;
    subject: string;
    headline: string;
    message: string;
    roomType: string;
    standardRate: number;
    discountPercent: number;
    firstEligibleNight: string;
    lastEligibleNight: string;
    bookByDate: string;
    sendTime: string;
    status: "Draft" | "Scheduled" | "Sent";
    updatedAt: string;
}

const MAX_CAMPAIGN_NAME = 80;
const MAX_SUBJECT = 120;
const MAX_MESSAGE = 600;

export function PromotionsClient({
                                     initialProperties = [],
                                     sampleCampaigns = [],
                                     isSample = false,
                                 }: {
    initialProperties?: PropertyOption[];
    sampleCampaigns?: PromotionCampaign[];
    isSample?: boolean;
}) {
    const supabase = createClient();
    const properties = initialProperties.length > 0 ? initialProperties : SAMPLE_PROPERTIES;

    const [tab, setTab] = useState<"create" | "campaigns">("create");
    const [campaigns, setCampaigns] = useState<PromotionCampaign[]>(sampleCampaigns);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const [propertyId, setPropertyId] = useState(properties[0].id);
    const [category, setCategory] = useState<PromotionCampaign["category"]>("Room openings");
    const [campaignName, setCampaignName] = useState("December coastal escape");
    const [audienceLabel, setAudienceLabel] = useState("Past guests who opted in · 2 eligible customers");
    const [subject, setSubject] = useState("A coastal escape is waiting at Harbor House");
    const [message, setMessage] = useState(
        "A few Coastal king rooms are open for Dec 6–10. Come back to Monterey and enjoy 10% off our standard nightly room rate. We would love to welcome you again."
    );
    const [firstEligibleNight, setFirstEligibleNight] = useState("Dec 6, 2026");
    const [lastEligibleNight, setLastEligibleNight] = useState("Dec 9, 2026");
    const [discountPercent, setDiscountPercent] = useState<number>(10);
    const [sendTime, setSendTime] = useState("Dec 1, 2026 · 9:00 AM Pacific");
    const [status, setStatus] = useState<PromotionCampaign["status"]>("Draft");

    const selectedProperty =
        properties.find((p) => p.id === propertyId) || properties[0];
    const safeRate = Math.max(0, Number(selectedProperty.rate) || 0);
    const safeDiscount = Math.min(90, Math.max(1, Number(discountPercent) || 10));
    const discountedRate = +(safeRate * (1 - safeDiscount / 100)).toFixed(2);

    useEffect(() => {
        if (!properties.some((p) => p.id === propertyId)) {
            setPropertyId(properties[0].id);
        }
    }, [isSample, properties, propertyId]);

    useEffect(() => {
        if (isSample) {
            setCampaigns(sampleCampaigns);
            setEditingId(null);
            return;
        }

        async function loadPromotions() {
            let loaded: PromotionCampaign[] = [];

            try {
                const local = JSON.parse(localStorage.getItem("likehome_promotions") || "[]");
                if (Array.isArray(local)) loaded = local;
            } catch (e) {
                console.error("Local promotions read error", e);
            }

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    const { data, error } = await supabase
                        .from("promotions")
                        .select("*")
                        .eq("owner_id", user.id)
                        .order("created_at", { ascending: false });

                    if (!error && data && data.length > 0) {
                        loaded = data.map((row) => ({
                            id: row.id,
                            propertyId: row.property_id,
                            propertyName: row.property_name,
                            propertyLocation: row.property_location || "California",
                            category: row.category,
                            campaignName: row.campaign_name,
                            audienceLabel: row.audience_label,
                            subject: row.subject,
                            headline: row.headline,
                            message: row.message,
                            roomType: row.room_type,
                            standardRate: Number(row.standard_rate),
                            discountPercent: Number(row.discount_percent),
                            firstEligibleNight: row.first_eligible_night || "",
                            lastEligibleNight: row.last_eligible_night || "",
                            bookByDate: row.book_by_date || "Dec 5",
                            sendTime: row.send_time || "",
                            status: row.status,
                            updatedAt: new Date(row.created_at).toLocaleDateString(),
                        }));
                    }
                }
            } catch {
                // Fallback stays active until Supabase table is ready
            }

            setCampaigns(loaded);
        }

        loadPromotions();
    }, [isSample, sampleCampaigns, supabase]);

    function notify(text: string, type: "ok" | "err" = "ok") {
        setToast({ type, text });
        setTimeout(() => setToast(null), 4500);
    }

    function validateCampaign(): string | null {
        const cleanName = campaignName.trim();
        const cleanSubject = subject.trim();
        const cleanMessage = message.trim();

        if (!cleanName) return "Please enter a campaign name.";
        if (cleanName.length > MAX_CAMPAIGN_NAME) {
            return `Campaign name must be ${MAX_CAMPAIGN_NAME} characters or fewer.`;
        }
        if (!cleanSubject) return "Please enter an email subject line.";
        if (cleanSubject.length > MAX_SUBJECT) {
            return `Subject must be ${MAX_SUBJECT} characters or fewer.`;
        }
        if (!cleanMessage) return "Please write a message for your guests.";
        if (cleanMessage.length > MAX_MESSAGE) {
            return `Message must be ${MAX_MESSAGE} characters or fewer.`;
        }
        if (!firstEligibleNight.trim() || !lastEligibleNight.trim()) {
            return "Please specify both first and last eligible nights.";
        }
        if (!sendTime.trim()) {
            return "Please specify a send time.";
        }

        const startTs = Date.parse(firstEligibleNight);
        const endTs = Date.parse(lastEligibleNight);
        if (!Number.isNaN(startTs) && !Number.isNaN(endTs) && endTs < startTs) {
            return "Last eligible night cannot be earlier than first eligible night.";
        }

        const duplicate = campaigns.find(
            (c) =>
                c.id !== editingId &&
                c.propertyId === selectedProperty.id &&
                c.campaignName.trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (duplicate) {
            return `A campaign named "${cleanName}" already exists for ${selectedProperty.name}.`;
        }

        return null;
    }

    async function saveCampaign(nextStatus: PromotionCampaign["status"], toastMsg: string) {
        if (saving) return;

        const validationError = validateCampaign();
        if (validationError) {
            notify(validationError, "err");
            return;
        }

        setSaving(true);
        const cleanName = campaignName.trim();
        const cleanSubject = subject.trim();
        const cleanMessage = message.trim();

        const entry: PromotionCampaign = {
            id: editingId ?? `promo_${Date.now()}`,
            propertyId: selectedProperty.id,
            propertyName: selectedProperty.name,
            propertyLocation: selectedProperty.location,
            category,
            campaignName: cleanName,
            audienceLabel,
            subject: cleanSubject,
            headline:
                category === "Room openings"
                    ? "Your next coastal escape"
                    : category === "Deal"
                        ? `Enjoy ${safeDiscount}% off your stay`
                        : `Updates from ${selectedProperty.name}`,
            message: cleanMessage,
            roomType: selectedProperty.roomType,
            standardRate: safeRate,
            discountPercent: safeDiscount,
            firstEligibleNight: firstEligibleNight.trim(),
            lastEligibleNight: lastEligibleNight.trim(),
            bookByDate: "Dec 5",
            sendTime: sendTime.trim(),
            status: nextStatus,
            updatedAt: "Just now",
        };

        const next = editingId
            ? campaigns.map((c) => (c.id === editingId ? entry : c))
            : [entry, ...campaigns];

        setCampaigns(next);
        setStatus(nextStatus);
        setEditingId(entry.id);

        if (isSample) {
            setSaving(false);
            notify("Sample mode — preview updated (not saved to live data).");
            return;
        }

        try {
            localStorage.setItem("likehome_promotions", JSON.stringify(next));
        } catch (e) {
            console.error("Local promotions write error", e);
        }

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const payload = {
                    owner_id: user.id,
                    property_id: entry.propertyId,
                    property_name: entry.propertyName,
                    property_location: entry.propertyLocation,
                    category: entry.category,
                    campaign_name: entry.campaignName,
                    audience_label: entry.audienceLabel,
                    subject: entry.subject,
                    headline: entry.headline,
                    message: entry.message,
                    room_type: entry.roomType,
                    standard_rate: entry.standardRate,
                    discount_percent: entry.discountPercent,
                    first_eligible_night: entry.firstEligibleNight,
                    last_eligible_night: entry.lastEligibleNight,
                    book_by_date: entry.bookByDate,
                    send_time: entry.sendTime,
                    status: nextStatus,
                };

                if (editingId && !editingId.startsWith("promo_")) {
                    await supabase.from("promotions").update(payload).eq("id", editingId);
                } else {
                    await supabase.from("promotions").insert(payload);
                }
            }
        } catch {
            // Graceful fallback
        }

        setSaving(false);
        notify(toastMsg);
    }

    function handleEditCampaign(camp: PromotionCampaign) {
        setEditingId(camp.id);
        setPropertyId(camp.propertyId);
        setCategory(camp.category);
        setCampaignName(camp.campaignName);
        setAudienceLabel(camp.audienceLabel);
        setSubject(camp.subject);
        setMessage(camp.message);
        setFirstEligibleNight(camp.firstEligibleNight);
        setLastEligibleNight(camp.lastEligibleNight);
        setDiscountPercent(camp.discountPercent);
        setSendTime(camp.sendTime);
        setStatus(camp.status);
        setTab("create");
    }

    function handleStartNew() {
        setEditingId(null);
        setCampaignName("");
        setSubject("");
        setStatus("Draft");
        setTab("create");
    }

    async function handleDeleteCampaign(id: string) {
        const next = campaigns.filter((c) => c.id !== id);
        setCampaigns(next);
        if (editingId === id) setEditingId(null);

        if (isSample) {
            notify("Sample campaign removed from preview.");
            return;
        }

        try {
            localStorage.setItem("likehome_promotions", JSON.stringify(next));
            if (!id.startsWith("promo_")) {
                await supabase.from("promotions").delete().eq("id", id);
            }
        } catch {
            // Graceful fallback
        }
        notify("Campaign deleted.");
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTab("campaigns")}
                        className={`rounded-control border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            tab === "campaigns"
                                ? "border-blue bg-blue text-on-blue"
                                : "border-edge bg-surface text-blue-dark hover:bg-paper"
                        }`}
                    >
                        Campaigns
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("create")}
                        className={`rounded-control border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            tab === "create"
                                ? "border-blue bg-blue text-on-blue"
                                : "border-edge bg-surface text-blue-dark hover:bg-paper"
                        }`}
                    >
                        Create promotion
                    </button>
                </div>

                {toast && (
                    <p
                        role="status"
                        className={`rounded-control border px-3 py-1 text-xs font-semibold ${
                            toast.type === "err"
                                ? "border-red-300 bg-red-50 text-red-800"
                                : "border-blue/30 bg-blue/10 text-blue-dark"
                        }`}
                    >
                        {toast.text}
                    </p>
                )}
            </div>

            {tab === "campaigns" ? (
                <div className="rounded-2xl border border-edge bg-surface p-5">
                    <div className="flex items-center justify-between border-b border-edge pb-3.5">
                        <div>
                            <h2 className="font-serif text-xl text-ink">Your campaigns</h2>
                            <p className="mt-0.5 text-xs text-slate">
                                Drafts, scheduled announcements, and past promotional offers.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleStartNew}
                            className="rounded-control bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue hover:bg-blue-dark"
                        >
                            + New campaign
                        </button>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-sm font-semibold text-ink">No saved campaigns yet</p>
                            <p className="mt-1 text-xs text-slate">
                                Create a promotion draft or schedule your first guest announcement.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-edge">
                            {campaigns.map((camp) => (
                                <div
                                    key={camp.id}
                                    className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
                                >
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-ink">{camp.campaignName}</span>
                                            <span
                                                className={`rounded-control border px-2 py-0.5 text-[11px] font-semibold ${
                                                    camp.status === "Scheduled"
                                                        ? "border-blue/30 bg-blue/10 text-blue-dark"
                                                        : "border-edge bg-paper text-slate"
                                                }`}
                                            >
                        {camp.status}
                      </span>
                                        </div>
                                        <p className="text-xs text-slate">
                                            {camp.propertyName} · {camp.category} · {camp.discountPercent}% off {camp.roomType}
                                        </p>
                                        <p className="text-xs text-slate/80">Subject: “{camp.subject}”</p>
                                    </div>

                                    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                                        <p className="text-xs font-semibold text-ink">{camp.sendTime}</p>
                                        <div className="flex items-center gap-2.5 text-[11px]">
                                            <button
                                                type="button"
                                                onClick={() => handleEditCampaign(camp)}
                                                className="font-semibold text-blue hover:text-blue-dark"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCampaign(camp.id)}
                                                className="font-semibold text-slate hover:text-ink"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                        <section className="space-y-3 rounded-2xl border border-edge bg-surface p-5">
                            <div>
                                <h2 className="font-serif text-2xl leading-7 text-ink">
                                    Room-opening announcement
                                </h2>
                                <p className="mt-0.5 text-xs text-slate">
                                    {status === "Draft" ? "Draft · not sent" : `${status} · ${sendTime}`}
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Property</label>
                                <select
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                >
                                    {properties.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} · {p.location}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {(["Room openings", "Deal", "Hotel news"] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`rounded-control border px-3 py-1 text-xs font-semibold transition-colors ${
                                            category === cat
                                                ? "border-blue bg-blue text-on-blue"
                                                : "border-edge bg-surface text-blue-dark hover:bg-paper"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Campaign name</label>
                                <input
                                    type="text"
                                    maxLength={MAX_CAMPAIGN_NAME}
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Audience</label>
                                <select
                                    value={audienceLabel}
                                    onChange={(e) => setAudienceLabel(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                >
                                    <option value="Past guests who opted in · 2 eligible customers">
                                        Past guests who opted in · 2 eligible customers
                                    </option>
                                    <option value="Repeat guests who opted in · 1 eligible customer">
                                        Repeat guests who opted in · 1 eligible customer
                                    </option>
                                </select>
                                <p className="mt-1 text-[11px] leading-snug text-slate">
                                    3 customer records checked · 1 excluded without permission. Unsubscribed customers are always excluded.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Subject</label>
                                <input
                                    type="text"
                                    maxLength={MAX_SUBJECT}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Message</label>
                                <textarea
                                    rows={3}
                                    maxLength={MAX_MESSAGE}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs leading-relaxed text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-ink">
                                        First eligible night
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        value={firstEligibleNight}
                                        onChange={(e) => setFirstEligibleNight(e.target.value)}
                                        className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-ink">
                                        Last eligible night
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        value={lastEligibleNight}
                                        onChange={(e) => setLastEligibleNight(e.target.value)}
                                        className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Offer</label>
                                <select
                                    value={safeDiscount}
                                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                >
                                    <option value={10}>
                                        10% off {selectedProperty.roomType} · ${safeRate} → $
                                        {(safeRate * 0.9).toFixed(2)} per night
                                    </option>
                                    <option value={15}>
                                        15% off {selectedProperty.roomType} · ${safeRate} → $
                                        {(safeRate * 0.85).toFixed(2)} per night
                                    </option>
                                    <option value={20}>
                                        20% off {selectedProperty.roomType} · ${safeRate} → $
                                        {(safeRate * 0.8).toFixed(2)} per night
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-ink">Send time</label>
                                <input
                                    type="text"
                                    maxLength={50}
                                    value={sendTime}
                                    onChange={(e) => setSendTime(e.target.value)}
                                    className="w-full rounded-control border border-edge bg-paper/40 px-3 py-1.5 text-xs text-ink focus:border-blue focus:bg-surface focus:outline-none"
                                />
                            </div>
                        </section>

                        <aside className="rounded-2xl border border-edge bg-surface p-5 sm:sticky sm:top-5">
                            <h2 className="font-serif text-2xl leading-7 text-ink">Guest preview</h2>
                            <p className="mt-2 text-xs font-semibold text-blue">
                                LikeHome · {selectedProperty.name}
                            </p>

                            <h3 className="mt-2.5 font-serif text-2xl leading-snug text-ink">
                                {category === "Room openings"
                                    ? "Your next coastal escape"
                                    : category === "Deal"
                                        ? `Enjoy ${safeDiscount}% off your stay`
                                        : `Updates from ${selectedProperty.name}`}
                            </h3>

                            <p className="mt-2 break-words text-xs leading-relaxed text-slate">
                                {message.trim() || "Your promotional message preview will appear here."}
                            </p>

                            <div className="mt-4 border-t border-edge pt-4">
                                <p className="text-xs font-semibold text-ink">{selectedProperty.roomType}</p>
                                <p className="mt-1 font-serif text-[26px] leading-8 text-blue">
                                    ${discountedRate.toFixed(2)}{" "}
                                    <span className="font-sans text-xs font-normal text-slate">/ night</span>
                                </p>

                                <div className="mt-1.5 space-y-0.5 text-[11px] text-slate">
                                    <p>
                                        Standard room rate ${safeRate} · {safeDiscount}% discount
                                    </p>
                                    <p>
                                        Eligible nights: {firstEligibleNight || "TBD"} – {lastEligibleNight || "TBD"}
                                    </p>
                                    <p>Departure by Dec 10 · book by Dec 5</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => notify("Preview: Guests will land directly on your room booking page.")}
                                    className="mt-3.5 rounded-control bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue hover:bg-blue-dark"
                                >
                                    View offer
                                </button>
                            </div>

                            <div className="mt-4 space-y-2 border-t border-edge pt-3.5 text-[11px] leading-relaxed text-slate">
                                <p>
                                    Subject to availability when booking. Taxes and fees shown before confirmation. Cannot be combined with other offers.
                                </p>
                                <p>
                                    You opted in to {selectedProperty.name} promotional updates. Manage preferences or unsubscribe at any time.
                                </p>
                            </div>
                        </aside>
                    </div>

                    <section className="rounded-2xl border border-edge bg-surface p-5">
                        <h2 className="font-serif text-xl text-ink">Before this announcement goes out</h2>
                        <p className="mt-1.5 text-xs text-slate">
                            2 opted-in past guests · property scope checked · offer dates included · unsubscribe link included
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate">
                            Room openings are rechecked when a traveler books. Sending an announcement does not reserve a room or override the overlapping-booking restriction.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => saveCampaign("Draft", "Campaign draft saved.")}
                                className="rounded-control border border-edge bg-surface px-3.5 py-1.5 text-xs font-semibold text-blue-dark transition-colors hover:bg-paper disabled:opacity-50"
                            >
                                Save draft
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => {
                                    const err = validateCampaign();
                                    if (err) {
                                        notify(err, "err");
                                        return;
                                    }
                                    notify("Test preview simulated (email delivery not connected yet).");
                                }}
                                className="rounded-control border border-edge bg-surface px-3.5 py-1.5 text-xs font-semibold text-blue-dark transition-colors hover:bg-paper disabled:opacity-50"
                            >
                                Send test preview
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                    saveCampaign("Scheduled", `Campaign "${campaignName.trim()}" scheduled for ${sendTime.trim()}.`)
                                }
                                className="rounded-control bg-blue px-3.5 py-1.5 text-xs font-semibold text-on-blue transition-colors hover:bg-blue-dark disabled:opacity-50"
                            >
                                Review &amp; schedule
                            </button>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}