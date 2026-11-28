import {notFound, redirect} from "next/navigation";
import {PAGE_ROUTES} from "@/constants/routes";
import {getCurrentUser} from "@/utils/current-user";
import { getViewer } from "@/utils/viewer";
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
  const viewer = await getViewer();
  if (viewer.role === "unchosen") redirect(PAGE_ROUTES.ACCOUNT_TYPE);
  if (viewer.role !== "business") redirect(PAGE_ROUTES.AUTHORIZATION_ERROR);
  const {id} = await params;
  const {tab, preview} = await searchParams;
  const listing = mockListings.find((item) => item.id === id);
  // New sample properties exist only in browser storage, not on the server.
  if (!listing && !id.startsWith("mock-created-")) notFound();
  return <MockPropertyEditor listing={listing} listingId={id} initialTab={toEditorTab(tab)} initialPreview={preview === "1"} />;
}
