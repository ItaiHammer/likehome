import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SkyBackground } from "@/app/_components/SkyBackground";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import type { Listing } from "@/types/listing";
import { getCurrentUser } from "@/utils/current-user";
import { getAccount } from "@/utils/accounts";
import { getMyListings } from "@/utils/listings";
import { OwnerSidebar } from "@/app/property-dashboard/_components/OwnerSidebar";
import { EmptyListings } from "./_components/EmptyListings";
import { ListingCreationToast } from "./_components/ListingCreationToast";
import { ListingPreview } from "./_components/ListingPreview";
import { ListingRow } from "./_components/ListingRow";

export const metadata: Metadata = { title: "My listings - LikeHome" };

type Props = {
  searchParams: Promise<{ sample?: string; id?: string; created?: string }>;
};

export default async function MyListingsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);

  const { sample, id, created } = await searchParams;
  const isDevelopment = process.env.NODE_ENV === "development";
  const isSample = isDevelopment && (sample === "1" || sample === "preview");

  let listings: Listing[];
  if (isSample) {
    const { mockListings } = await import("./mock/data");
    listings = mockListings;
  } else {
    const { data, error } = await getMyListings(user.id);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Listings unavailable");
    listings = data;
  }

  const { data: account } = await getAccount(user.id);
  const ownerName =
    typeof account?.full_name === "string" && account.full_name.trim()
      ? account.full_name.trim()
      : "Property owner";
  const ownerEmail = typeof account?.email === "string" ? account.email : null;

  if (isSample && sample === "preview") {
    const selectedListing = listings.find((listing) => listing.id === id) ?? listings[0];
    return (
      <main className="flex flex-1 flex-col">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
          <OwnerSidebar active="listings" name={ownerName} email={ownerEmail} className="w-full lg:sticky lg:top-5" />
          <div className="min-w-0">
            <p className="rounded-control border border-blue/20 bg-blue/10 px-4 py-3 text-sm text-ink">
              <strong>SAMPLE DATA</strong> - This listing is fictional and has not been saved or published.
            </p>
            <ListingPreview
              draft={selectedListing}
              backLink={
                <Link href="/listings?sample=1" className="inline-flex items-center gap-2 text-sm font-semibold text-blue hover:text-blue-dark">
                  <span aria-hidden="true">←</span> Back to My listings
                </Link>
              }
            />
          </div>
        </div>
      </main>
    );
  }

  const toastKind =
    created === "1" && !isSample
      ? "created"
      : created === "sample" && isSample
        ? "sample"
        : null;

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
          <SkyBackground />
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-blue">Property management</p>
          <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">My listings</h1>
          <p className="mt-2 text-xl leading-7 text-ink">Manage your properties and keep their details up to date.</p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
        <OwnerSidebar active="listings" name={ownerName} email={ownerEmail} className="w-full lg:sticky lg:top-5" />
        <div className="min-w-0 space-y-5">
          {(isDevelopment || listings.length > 0) && (
            <div className="flex flex-wrap items-center gap-3">
              {isDevelopment && (
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-control border border-blue/20 bg-blue/5 px-4 py-3 text-sm">
                  <p className="min-w-0 text-ink">
                    {isSample
                      ? "SAMPLE DATA - Three fictional properties. Nothing here is saved."
                      : "Preview My listings with test properties without creating any."}
                  </p>
                  <Link href={isSample ? "/listings" : "/listings?sample=1"} className="shrink-0 font-semibold text-blue hover:text-blue-dark">
                    {isSample ? "Return to real listings" : "Show sample listings"}
                  </Link>
                </div>
              )}
              {listings.length > 0 && (
                <Button href={isSample ? "/listings/new?sample=1" : "/listings/new"} className="ml-auto shrink-0 whitespace-nowrap">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                  Add property
                </Button>
              )}
            </div>
          )}

          {listings.length > 0 ? (
            <ul className="space-y-4">
              {listings.map((listing, index) => (
                <ListingRow key={listing.id} listing={listing} index={index} isSample={isSample} />
              ))}
            </ul>
          ) : (
            // EmptyListings has its own Add property button. Do not duplicate it above.
            <EmptyListings />
          )}
        </div>
      </div>
      <ListingCreationToast kind={toastKind} />
    </main>
  );
}
