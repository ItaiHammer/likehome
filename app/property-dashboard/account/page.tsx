import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SkyBackground } from "@/app/_components/SkyBackground";
import { PAGE_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/utils/current-user";
import { getAccount } from "@/utils/accounts";
import { getMyListings } from "@/utils/listings";
import { OwnerSidebar } from "@/app/property-dashboard/_components/OwnerSidebar";
import { OwnerAccountClient } from "./OwnerAccountClient";
import { EMPTY_OWNER_ACCOUNT, SAMPLE_OWNER_ACCOUNT } from "./mock-data";

export const metadata: Metadata = { title: "Account - LikeHome" };

type Props = {
    searchParams: Promise<{ sample?: string }>;
};

export default async function OwnerAccountPage({ searchParams }: Props) {
    const user = await getCurrentUser();
    if (!user) redirect(PAGE_ROUTES.LOGIN);

    const { sample } = await searchParams;
    const isDevelopment = process.env.NODE_ENV === "development";
    const isSample = isDevelopment && sample !== "0";

    const { data: account } = await getAccount(user.id);
    const ownerName =
        typeof account?.full_name === "string" && account.full_name.trim()
            ? account.full_name.trim()
            : "Omar Noqui";
    const ownerEmail =
        typeof account?.email === "string" ? account.email : user.email ?? "omar.noqui@sjsu.edu";

    const { data: listings } = await getMyListings(user.id);
    const listingCount = isSample ? 2 : (listings?.length ?? 0);

    return (
        <main className="flex flex-1 flex-col">
            <section className="relative isolate pt-12 pb-16 sm:pt-16 sm:pb-20">
                <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
                    <SkyBackground />
                </div>
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-blue">
                        Owner settings
                    </p>
                    <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
                        Account
                    </h1>
                    <p className="mt-2 text-xl leading-7 text-ink">
                        Manage your personal details, business contacts and owner preferences.
                    </p>
                </div>
            </section>

            <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
                <OwnerSidebar
                    active="account"
                    name={ownerName}
                    email={ownerEmail}
                    className="w-full lg:sticky lg:top-5"
                />
                <div className="min-w-0 space-y-5">
                    {isDevelopment && (
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href={isSample ? "/property-dashboard/account?sample=0" : "/property-dashboard/account"}
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

                    <OwnerAccountClient
                        name={ownerName}
                        email={ownerEmail}
                        listingCount={listingCount}
                        isSample={isSample}
                        initialData={isSample ? SAMPLE_OWNER_ACCOUNT : EMPTY_OWNER_ACCOUNT}
                    />
                </div>
            </div>
        </main>
    );
}