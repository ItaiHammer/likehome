"use client"; // Error boundaries must be Client Components

import { Button } from "@/app/_components/ui";

// Shown when loading My listings or a property fails unexpectedly (e.g. the database is down).
export default function ListingsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <section role="alert" className="max-w-2xl rounded-lg border border-edge bg-surface p-8 sm:p-12">
        <p className="text-sm font-semibold text-blue">My listings</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[48px] text-ink">We couldn&apos;t load this page.</h1>
        <p className="mt-3 leading-7 text-slate">Check your connection and try again. Nothing you saved earlier has been lost.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="secondary" href="/">
            Go to the home page
          </Button>
        </div>
      </section>
    </main>
  );
}
