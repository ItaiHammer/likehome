import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/utils/current-user";
import { getMyListings } from "@/utils/listings";
import { ListingRow } from "./_components/ListingRow";

export const metadata: Metadata = { title: "My listings — LikeHome" };

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);

  const { data: listings, error } = await getMyListings(user.id);
  if (error) throw new Error(error);

  return (
    <main className="w-full flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[2rem] leading-10 font-medium text-ink">My listings</h1>
            <p className="mt-2 text-lg text-slate">Manage your properties and keep their details up to date.</p>
          </div>
          <Button variant="secondary" href="/listings/new">
            Add property
          </Button>
        </div>

        {listings.length > 0 ? (
          <ul className="mt-6">
            {listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </ul>
        ) : (
          <p className="mt-10 border-t border-edge pt-10 text-slate">
            You haven&apos;t listed a property yet. Add one to start taking bookings.
          </p>
        )}
      </div>
    </main>
  );
}
