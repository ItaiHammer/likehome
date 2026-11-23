import {notFound, redirect} from "next/navigation";
import {PAGE_ROUTES} from "@/constants/routes";
import {getCurrentUser} from "@/utils/current-user";
import {MockPropertyEditor} from "../../../_components/MockPropertyEditor";
import {toEditorTab} from "../../../_components/editor-state";
import {mockListings} from "../../data";

export default async function EditMockListingPage({params, searchParams}: {
  params: Promise<{id: string}>;
  searchParams: Promise<{tab?: string; preview?: string}>;
}) {
  // Never expose a sample editor in production.
  if (process.env.NODE_ENV !== "development") notFound();
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);
  const {id} = await params;
  const {tab, preview} = await searchParams;
  const listing = mockListings.find((item) => item.id === id);
  if (!listing) notFound();
  return <MockPropertyEditor listing={listing} initialTab={toEditorTab(tab)} initialPreview={preview === "1"} />;
}
