
import type { Metadata } from "next";
import { PropertyDashboardShell } from "../_components/PropertyDashboardShell";
import { OwnerMessagesDashboard } from "./OwnerMessagesDashboard";
import { getCurrentUser } from "@/utils/current-user";
import { getAccount } from "@/utils/accounts";
import { getHotelsByOwner } from "@/utils/hotels";

export const metadata: Metadata = {
  title: "Reservation messages — LikeHome",
};

export default async function MessagesPage(
    props: PageProps<"/property-dashboard/messages">
) {
    const searchParams = await props.searchParams;
    const initialView = searchParams.view === "compose" ? "compose" : "sent";

    const user = await getCurrentUser();

  const account = user
      ? await getAccount(user.id)
      : null;

  const isBusiness =
      Boolean(user) &&
      !account?.error &&
      account?.data?.account_type === "business";

  const hotels = isBusiness && user
      ? await getHotelsByOwner(user.id)
      : { data: null, error: null };

  return (
      <PropertyDashboardShell
          title="Reservation messages"
          description="Send hotel updates and review messages you have sent to travelers."
          active="messages"
      >
        {hotels.error ? (
            <p
                role="alert"
                className="rounded-lg border border-danger/40 bg-surface p-5 text-sm text-ink"
            >
              Couldn&apos;t load your properties. Please try again.
            </p>
        ) : (
            <OwnerMessagesDashboard
                initialView={initialView}
                hotels={(hotels.data ?? []).map((hotel) => ({
                  id: String(hotel.id),
                  name: String(hotel.name),
                }))}
            />
        )}
      </PropertyDashboardShell>
  );
}
