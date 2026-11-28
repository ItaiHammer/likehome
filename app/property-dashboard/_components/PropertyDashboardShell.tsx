
import { notFound, redirect } from "next/navigation";
import { SkyBackground } from "@/app/_components/SkyBackground";
import { getCurrentUser } from "@/utils/current-user";
import { getAccount } from "@/utils/accounts";
import { OwnerSidebar } from "./OwnerSidebar";

export async function PropertyDashboardShell({
                                               title,
                                               description,
                                               active,
                                               children,
                                             }: {
  title: string;
  description: string;
  active: "customers" | "messages";
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const currentPath = `/property-dashboard/${active}`;

  if (!user) {
    redirect(
        `/auth/login?next=${encodeURIComponent(currentPath)}`
    );
  }

  const { data: account, error } = await getAccount(
      user.id
  );

  if (error || account?.account_type !== "business") {
    notFound();
  }

  const ownerName =
      typeof account.full_name === "string" &&
      account.full_name.trim()
          ? account.full_name.trim()
          : "Property owner";

  const ownerEmail =
      typeof account.email === "string"
          ? account.email
          : null;

  const eyebrow =
      active === "customers"
          ? "Guest management"
          : "Guest communications";

  return (
      <main className="flex w-full flex-1 flex-col font-sans">
        <section className="relative isolate pt-12 pb-7 sm:pt-14 sm:pb-9">
          <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
            <SkyBackground />
          </div>

          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue">
              {eyebrow}
            </p>

            <h1 className="font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">
              {title}
            </h1>

            <p className="mt-2 text-lg leading-7 text-slate">
              {description}
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pt-3 pb-12 sm:px-6 sm:pt-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
          <OwnerSidebar
              name={ownerName}
              email={ownerEmail}
              active={active}
              className="w-full lg:sticky lg:top-5"
          />

          <div className="min-w-0">{children}</div>
        </div>
      </main>
  );
}
