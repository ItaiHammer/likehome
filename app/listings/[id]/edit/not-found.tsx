import { Button } from "@/app/_components/ui";

// A missing ID, or a property owned by someone else (both look the same on purpose).
export default function ListingNotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <section className="max-w-2xl rounded-lg border border-edge bg-surface p-8 sm:p-12">
        <p className="text-sm font-semibold text-blue">My listings</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[48px] text-ink">We couldn&apos;t find that property.</h1>
        <p className="mt-3 leading-7 text-slate">The link may be out of date, or the property may belong to another account.</p>
        <Button href="/listings" className="mt-8">
          Back to My listings
        </Button>
      </section>
    </main>
  );
}
