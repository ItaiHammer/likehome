import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, FormError } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { nextPath } from "@/lib/account-type";
import { getAccountType } from "@/utils/accounts";
import { getUserId } from "@/utils/user";
import { chooseAccountType } from "./actions";

export const metadata: Metadata = { title: "Choose your account type — LikeHome" };

const CHOICES = [
  { type: "personal", title: "I'm traveling", body: "Book stays and manage your trips in My Bookings." },
  { type: "business", title: "I own a property", body: "List your hotel and manage its rooms in Listings." },
] as const;

// New accounts have no type yet, so the proxy sends them here before My Bookings or Listings
export default async function AccountTypePage(props: PageProps<"/account-type">) {
  const { next, error } = await props.searchParams;
  const { userId } = await getUserId();
  if (!userId) {
    redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(`${PAGE_ROUTES.ACCOUNT_TYPE}?next=${encodeURIComponent(nextPath(next, null))}`)}`);
  }
  // Already chosen (e.g. a bookmark to this page): nothing to do here
  const { data: current } = await getAccountType(userId);
  if (current) redirect(nextPath(next, current));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Card as="section" padding="lg" className="max-w-2xl">
        <p className="text-sm font-semibold text-blue">Your account</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[48px] text-ink">How will you use LikeHome?</h1>
        <p className="mt-3 leading-7 text-slate">You choose this once, and it can&apos;t be changed later.</p>
        <FormError className="mt-4" message={error ? "We couldn't save your choice. Please try again." : undefined} />
        <form action={chooseAccountType} className="mt-8 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
          {CHOICES.map((choice) => (
            <button
              key={choice.type}
              type="submit"
              name="type"
              value={choice.type}
              className="rounded-2xl border border-edge bg-surface p-5 text-left transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            >
              <span className="block font-semibold text-ink">{choice.title}</span>
              <span className="mt-1 block text-sm leading-6 text-slate">{choice.body}</span>
            </button>
          ))}
        </form>
      </Card>
    </main>
  );
}
