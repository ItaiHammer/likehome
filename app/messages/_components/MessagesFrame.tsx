import { redirect } from "next/navigation";
import { PageBackdrop } from "@/app/_components/PageBackdrop";
import { buttonClass } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { choicePathFor } from "@/lib/account/choice";
import { getViewer } from "@/utils/viewer";

/**
 * Sends anyone but a traveler elsewhere, coming back to `back` afterwards. False when the account
 * couldn't be read, so the page shows AccountUnread.
 */
export async function requireTraveler(back: string): Promise<boolean> {
  const viewer = await getViewer();
  if (viewer.role === "signed-out" || !viewer.userId) redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(back)}`);
  if (viewer.role === "unchosen") redirect(choicePathFor(back));
  if (viewer.role === "business") redirect(PAGE_ROUTES.OWNER_MESSAGES);
  return viewer.role === "personal";
}

/** The subpage header: an eyebrow (or a back link in its place), serif title and subtitle */
export function MessagesFrame({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {typeof eyebrow === "string" ? (
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue">{eyebrow}</p>
        ) : (
          eyebrow
        )}
        <h1 className="mt-2 break-words font-serif text-[44px] leading-[52px] text-ink sm:text-[56px] sm:leading-[64px]">{title}</h1>
        <p className="mt-2 break-words text-lg leading-7 text-slate">{subtitle}</p>
        <div className="mt-8 sm:mt-10">{children}</div>
      </main>
    </div>
  );
}

export function AccountUnread({ back }: { back: string }) {
  return (
    <section aria-labelledby="account-unread-heading" className="mx-auto max-w-[900px] rounded-lg border border-edge bg-surface p-8 sm:p-12">
      <h2 id="account-unread-heading" className="font-serif text-[32px] leading-10 text-ink">
        We couldn’t read your account just now.
      </h2>
      <p className="mt-3 leading-7 text-slate">Your messages are safe. This is usually brief, so give it another try in a moment.</p>
      {/* A full page load, so the layout reads the account again too */}
      <a href={back} className={`${buttonClass("primary")} mt-8`}>
        Try again
      </a>
    </section>
  );
}
