"use client";

import { Button } from "@/app/_components/ui";

export default function MyBookingsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <section role="alert" className="max-w-2xl rounded-lg border border-edge bg-surface p-8 sm:p-12">
        <p className="text-sm font-semibold text-blue">My bookings</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[48px] text-ink">We couldn&apos;t load your bookings.</h1>
        <p className="mt-3 leading-7 text-slate">Check your connection and try again. Your reservations haven&apos;t changed.</p>
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
