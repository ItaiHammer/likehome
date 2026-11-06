import {cookies} from "next/headers";
import {notFound} from "next/navigation";
import {createClient} from "@/utils/supabase/server";
import {
    getComparisonListings,
    getRecentlyViewedListings,
} from "@/utils/comparison";
import type {ComparisonListing} from "@/lib/comparison";
import {ComparisonFlow} from "./ComparisonFlow";

export const dynamic = "force-dynamic";

export default async function ComparePage({
                                              params,
                                          }: {
    params: Promise<{ slug: string }>;
}) {
    const {slug} = await params;

    const supabase = createClient(await cookies());
    const {data: claimsData} =
        await supabase.auth.getClaims();

    const accountId =
        claimsData?.claims?.sub;

    /*
     * The comparison page only needs lightweight listing data.
     * Avoid loading full reservation/availability data here.
     */
    const {
        data: currentListings,
        error: currentError,
    } = await getComparisonListings([slug]);

    if (currentError) {
        throw new Error(currentError.message);
    }

    const currentStay =
        currentListings[0];

    if (!currentStay) {
        notFound();
    }

    let recentStays: ComparisonListing[] = [];

    if (accountId) {
        const {
            data,
            error,
        } = await getRecentlyViewedListings(
            accountId,
            currentStay.id,
        );

        if (error) {
            throw new Error(error.message);
        }

        recentStays = data.slice(0, 10);
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-9">
                <ComparisonFlow
                    currentStay={currentStay}
                    recentStays={recentStays}
                    signedIn={!!accountId}
                />
            </main>
        </div>
    );
}