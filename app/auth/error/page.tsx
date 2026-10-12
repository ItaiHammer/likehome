import type { Metadata } from "next";
import { Button, Card } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Sign-in error — LikeHome" };

export default async function AuthError(props: PageProps<"/auth/error">) {
  // Keep where the guest was headed (e.g. a stay they were reserving) when they try again
  const { next } = await props.searchParams;
  const retry = typeof next === "string" && next.startsWith("/") ? `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(next)}` : PAGE_ROUTES.LOGIN;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Card as="section" padding="lg" className="max-w-2xl">
        <p className="text-sm font-semibold text-blue">Sign in</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[48px] text-ink">We couldn&apos;t sign you in.</h1>
        <p className="mt-3 leading-7 text-slate">The Google sign-in was cancelled or didn&apos;t finish. Please try again.</p>
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
