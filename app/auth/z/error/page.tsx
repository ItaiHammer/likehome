import type { Metadata } from "next";
import { Button, Card } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Authorization error — LikeHome" };

export default async function AuthzError(props: PageProps<"/auth/z/error">) {
  // Keep where the guest was headed (e.g. a stay they were reserving) when they try again
  const { next } = await props.searchParams;
  const retry = typeof next === "string" && next.startsWith("/") ? `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(next)}` : PAGE_ROUTES.LOGIN;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Card as="section" padding="lg" className="max-w-2xl">
        <p className="text-sm font-semibold text-blue">Access</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[48px] text-ink">We couldn&apos;t show you this page.</h1>
        <p className="mt-3 leading-7 text-slate">Your account type doesn&apos;t have permission to view this page.<br></br>If you think this is a mistake, please try signing in again.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={retry}>Try again</Button>
          <Button variant="secondary" href="/">
            Go to the home page
          </Button>
        </div>
      </Card>
    </main>
  );
}