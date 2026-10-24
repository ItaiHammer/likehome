import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { getRecentlyViewedHotels } from "@/utils/recently-viewed";
import { getStay, type Stay } from "../../_data/stays";
import { getHotelStay } from "../../reserve/[slug]/hotelStay";
import {
    ComparisonFlow,
    type RecentComparisonStay,
} from "./ComparisonFlow";

export const dynamic = "force-dynamic";

const findStay = cache(
    async (slug: string) =>
        getStay(slug) ?? (await getHotelStay(slug)),
);

type RecentlyViewedRow = {
    viewed_at: string;
    hotels: {
        id: string;
    } | null;
};

export default async function ComparePage({
                                              params,
                                          }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const currentStay = await findStay(slug);

    if (!currentStay) {
        notFound();
    }

    const supabase = createClient(await cookies());
    const { data: claimsData } = await supabase.auth.getClaims();
    const accountId = claimsData?.claims?.sub;

    let recentStays: RecentComparisonStay[] = [];

    if (accountId) {
        const { data } = await getRecentlyViewedHotels(accountId);
        const rows = (data ?? []) as unknown as RecentlyViewedRow[];

        const seen = new Set<string>();

        /*
         * Look at the 11 most recent saved hotels.
         * The current hotel may be one of those 11, so after excluding it
         * the comparison page can still show up to 10 alternatives.
         */
        const history = rows
            .slice(0, 11)
            .filter((row) => {
                const hotelId = row.hotels?.id;

                if (!hotelId) return false;
                if (hotelId === currentStay.slug) return false;
                if (seen.has(hotelId)) return false;

                seen.add(hotelId);
                return true;
            })
            .slice(0, 10);

        const loaded = await Promise.all(
            history.map(async (row) => {
                const hotelId = row.hotels!.id;
                const stay = await getHotelStay(hotelId);

                if (!stay) return null;

                return {
                    stay,
                    viewedAt: row.viewed_at,
                } satisfies RecentComparisonStay;
            }),
        );

        recentStays = loaded.filter(
            (item): item is RecentComparisonStay =>
                item !== null,
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-9">
                <ComparisonFlow
                    currentStay={currentStay as Stay}
                    recentStays={recentStays}
                />
            </main>
        </div>
    );
}