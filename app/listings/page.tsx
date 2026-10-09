import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SkyBackground } from "@/app/_components/SkyBackground";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/utils/current-user";
import { getMyListings } from "@/utils/listings";
import { EmptyListings } from "./_components/EmptyListings";
import { ListingRow } from "./_components/ListingRow";

export const metadata: Metadata = { title: "My listings — LikeHome" };

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);

  const { data: listings, error } = await getMyListings(user.id);
  if (error) throw new Error(error);

  return (
    <div className="flex flex-1 flex-col">
      {/* The home page's sky, shorter, fading into the page background */}
      <section className="relative isolate px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
          <SkyBackground />
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">My listings</h1>
            <p className="mt-2 text-xl leading-7 text-ink">Manage your properties and keep their details up to date.</p>
          </div>
          {listings.length > 0 && (
            <Button href="/listings/new" className="self-start sm:self-auto">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M10 4v12M4 10h12" />
              </svg>
              Add property
            </Button>
          )}
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pb-12 sm:px-6">
        {listings.length > 0 ? (
          <ul className="space-y-4">
            {listings.map((listing, i) => (
              <ListingRow key={listing.id} listing={listing} index={i} />
            ))}
          </ul>
        ) : (
          <EmptyListings />
        )}
      </main>
    </div>
  );
}
