"use server";

import { redirect } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { nextPath, parseAccountType } from "@/lib/account-type";
import { setAccountType } from "@/utils/accounts";
import { getUserId } from "@/utils/user";

// set_account_type only sets the caller's own type, and only once (P0001 once it's set)
export async function chooseAccountType(formData: FormData) {
  const next = formData.get("next");
  const { userId } = await getUserId();
  if (!userId) {
    redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(`${PAGE_ROUTES.ACCOUNT_TYPE}?next=${encodeURIComponent(nextPath(next, null))}`)}`);
  }

  const type = parseAccountType(formData.get("type"));
  if (!type) redirect(`${PAGE_ROUTES.ACCOUNT_TYPE}?error=1&next=${encodeURIComponent(nextPath(next, null))}`);

  const { error } = await setAccountType(type);
  // Already set (a second tab, a double submit): go on with the type that's saved
  if (error && error.code !== "P0001") {
    console.error("setAccountType failed:", error);
    redirect(`${PAGE_ROUTES.ACCOUNT_TYPE}?error=1&next=${encodeURIComponent(nextPath(next, type))}`);
  }
  redirect(nextPath(next, type));
}
