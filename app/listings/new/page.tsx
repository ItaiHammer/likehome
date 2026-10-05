import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/utils/current-user";
import { PropertyEditor } from "../_components/PropertyEditor";

export const metadata: Metadata = { title: "New property — LikeHome" };

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect(PAGE_ROUTES.LOGIN);

  return <PropertyEditor initialTab="info" />;
}
