import { redirect } from "next/navigation";
import { AuthCardLayout } from "@/app/_components/AuthCardLayout";
import { SampleNotice } from "@/app/MyBookings/_components/SampleNotice";
import { PAGE_ROUTES } from "@/constants/routes";
import { afterChoicePath, choicePathFor, safeNext } from "@/lib/account/choice";
import { getViewer } from "@/utils/viewer";
import { AccountTypeForm } from "./AccountTypeForm";
import styles from "./page.module.css";

export const metadata = { title: "Choose your account type — LikeHome" };

export default async function AccountTypePage({ searchParams }: PageProps<"/account-type">) {
  const next = safeNext((await searchParams).next);
  const viewer = await getViewer();

  if (viewer.role === "signed-out") redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(choicePathFor(next))}`);
  if (viewer.role !== "unchosen") redirect(afterChoicePath(next, viewer.role));

  // Development only: say where a save would land before it happens
  const notice =
    process.env.NODE_ENV !== "development"
      ? null
      : viewer.devRole
        ? "Dev override: nothing is saved."
        : `This saves to ${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://unknown").hostname}, once and for good.`;

  return (
    <AuthCardLayout title="Make LikeHome yours." subtitle="Choose your account type." className={styles.card}>
      {notice && <SampleNotice label="Dev">{notice}</SampleNotice>}
      <AccountTypeForm next={next} />
    </AuthCardLayout>
  );
}
