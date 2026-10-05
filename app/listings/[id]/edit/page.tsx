import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/utils/current-user";
import { getListing } from "@/utils/listings";
import { toEditorTab } from "../../_components/editor-state";
import { PropertyEditor } from "../../_components/PropertyEditor";

export const metadata: Metadata = { title: "Edit property — LikeHome" };

export default async function EditListingPage(props: PageProps<"/listings/[id]/edit">) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;

  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);

  // Someone else's property looks the same as a missing one, so IDs can't be probed.
  const { data: listing } = await getListing(id);
  if (!listing || listing.ownerId !== user.id) notFound();

  return <PropertyEditor listing={listing} initialTab={toEditorTab(tab)} />;
}
