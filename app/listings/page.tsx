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
import { ListingPreview } from "./_components/ListingPreview";
import { ListingRow } from "./_components/ListingRow";

export const metadata: Metadata = { title: "My listings — LikeHome" };

type Props = {
  searchParams: Promise<{ sample?: string; id?: string }>;
};

export default async function MyListingsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);

  const { sample, id } = await searchParams;
  const isDevelopment = process.env.NODE_ENV === "development";
  const isSample = isDevelopment && (sample === "1" || sample === "preview");

  // The real page and the real ListingRow component are reused for either data source.
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
  const ownerEmail =
    typeof account?.email === "string" ? account.email : null;

  // Same /listings route; previews are read-only and never open an editor for mock IDs.
  if (isSample && sample === "preview") {
    const selectedListing = listings.find((listing) => listing.id === id) ?? listings[0];
    return (
      <main className="flex flex-1 flex-col">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
          <OwnerSidebar active="listings" name={ownerName} email={ownerEmail} className="max-w-sm lg:sticky lg:top-5" />
          <div className="min-w-0">
            <p className="rounded-control border border-blue/20 bg-blue/10 px-4 py-3 text-sm text-ink">
              <strong>SAMPLE DATA</strong> — This listing is fictional and has not been saved or published.
            </p>
            <ListingPreview
              draft={selectedListing}
              backLink={
                <Link href="/listings?sample=1" className="font-semibold text-blue hover:text-blue-dark">
                  Back to sample listings
                </Link>
              }
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
          <SkyBackground />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
              My listings
            </h1>
            <p className="mt-2 text-xl leading-7 text-ink">
              Manage your properties and keep their details up to date.
            </p>
          </div>
          {listings.length > 0 && (
            isSample ? (
              <span aria-disabled="true" className="self-start rounded-control border border-edge bg-surface px-4 py-2 text-sm text-slate opacity-60 sm:self-auto">
                Add property (sample only)
              </span>
            ) : (
              <Button href="/listings/new" className="self-start sm:self-auto">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" />
                </svg>
                Add property
              </Button>
            )
          )}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
        <OwnerSidebar active="listings" name={ownerName} email={ownerEmail} className="max-w-sm lg:sticky lg:top-5" />
        <div className="min-w-0 space-y-5">
          {isDevelopment && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-blue/20 bg-blue/5 px-4 py-3 text-sm">
              <p className="text-ink">
                {isSample
                  ? "SAMPLE DATA — Three fictional properties. No database changes."
                  : "Preview My listings with test properties without creating any."}
              </p>
              <Link
                href={isSample ? "/listings" : "/listings?sample=1"}
                className="font-semibold text-blue hover:text-blue-dark"
              >
                {isSample ? "Return to real listings" : "Show sample listings"}
              </Link>
            </div>
          )}

          {listings.length > 0 ? (
            <ul className="space-y-4">
              {listings.map((listing, index) => (
                <ListingRow key={listing.id} listing={listing} index={index} isSample={isSample} />
              ))}
            </ul>
          ) : (
            <EmptyListings />
          )}
        </div>
      </div>
    </main>
  );
}
