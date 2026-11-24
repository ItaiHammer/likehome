import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SkyBackground } from "@/app/_components/SkyBackground";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/utils/current-user";
import { getAccount } from "@/utils/accounts";
import { getMyListings } from "@/utils/listings";
import { OwnerSidebar } from "@/app/property-dashboard/_components/OwnerSidebar";
import { PromotionsClient } from "./PromotionsClient";
import { SAMPLE_CAMPAIGNS, SAMPLE_PROPERTIES } from "./mock-data";

export const metadata: Metadata = { title: "Promotions - LikeHome" };

type Props = {
    searchParams: Promise<{ sample?: string }>;
};

export default async function PromotionsPage({ searchParams }: Props) {
    const user = await getCurrentUser();
    if (!user) redirect(PAGE_ROUTES.LOGIN);

    const { sample } = await searchParams;
    const isDevelopment = process.env.NODE_ENV === "development";
    const isSample = isDevelopment && sample !== "0";

    const { data: account } = await getAccount(user.id);
    const ownerName =
        typeof account?.full_name === "string" && account.full_name.trim()
            ? account.full_name.trim()
            : "Property owner";
    const ownerEmail = typeof account?.email === "string" ? account.email : user.email ?? null;

    const { data: listings } = await getMyListings(user.id);
    const liveProperties = (listings ?? []).map((listing) => ({
        id: listing.id,
        name: listing.name,
        location: listing.location || "California",
        roomType: listing.rooms?.[0]?.name || "Coastal king",
        rate: listing.rooms?.[0]?.nightly || 189,
    }));

    const hasProperties = isSample || liveProperties.length > 0;
    const properties = isSample ? SAMPLE_PROPERTIES : liveProperties;

    return (
        <main className="flex flex-1 flex-col">
            <section className="relative isolate pt-12 pb-16 sm:pt-16 sm:pb-20">
                <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
                    <SkyBackground />
                </div>
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-blue">Promotions</p>
                    <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
                        Promotions
                    </h1>
                    <p className="mt-2 text-xl leading-7 text-ink">
                        Create relevant offers for customers who have opted in.
                    </p>
                </div>
            </section>

            <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
                <OwnerSidebar
                    active="promotions"
                    name={ownerName}
                    email={ownerEmail}
                    className="w-full lg:sticky lg:top-5"
                />
                <div className="min-w-0 space-y-5">
                    {isDevelopment && (
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href={isSample ? "/property-dashboard/promotions?sample=0" : "/property-dashboard/promotions"}
                                className="rounded-control border border-edge bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
                            >
                                {isSample ? "Return to live data" : "Preview sample data"}
                            </Link>
                            {isSample && (
                                <span className="text-sm text-slate">
                  SAMPLE DATA — local preview only (not saved)
                </span>
                            )}
                        </div>
                    )}

                    {hasProperties ? (
                        <PromotionsClient
                            initialProperties={properties}
                            sampleCampaigns={isSample ? SAMPLE_CAMPAIGNS : []}
                            isSample={isSample}
                        />
                    ) : (
                        <div className="space-y-3 pt-1">
                            <div>
                                <p className="text-sm font-semibold text-ink">No properties yet</p>
                                <p className="mt-0.5 text-xs text-slate">
                                    Add a property before sending promotions.
                                </p>
                            </div>
                            <Button href="/listings/new">Add property</Button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}