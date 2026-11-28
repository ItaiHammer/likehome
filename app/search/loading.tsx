import { SkyBackground } from "@/app/_components/SkyBackground";

/** Route-level loading: show the page being opened, not a shimmer on the card clicked. */
export default function SearchLoading() {
  const bar = "rounded-xl bg-disabled";
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <p role="status" className="sr-only">Loading search results…</p>
      <section className="relative isolate pb-10 pt-8 sm:pb-12 sm:pt-10">
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)]">
          <SkyBackground />
        </div>
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-[1152px] gap-3 animate-pulse motion-reduce:animate-none" aria-hidden="true">
            <div className={`h-16 min-w-0 flex-1 ${bar}`} />
            <div className={`h-16 w-16 shrink-0 ${bar}`} />
            <div className={`h-16 w-16 shrink-0 ${bar}`} />
          </div>
        </div>
      </section>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 sm:px-6 lg:px-10" aria-hidden="true">
        <div className="animate-pulse motion-reduce:animate-none">
          <div className={`h-5 w-28 ${bar}`} />
          <div className={`mt-4 h-12 w-[28rem] max-w-full ${bar}`} />
          <div className={`mt-3 h-5 w-32 ${bar}`} />
          <div className="mt-9 border-t border-edge pt-9 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6">
            <div className={`hidden h-96 lg:block ${bar}`} />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-edge bg-surface">
                  <div className="aspect-[16/10] bg-disabled" />
                  <div className="space-y-3 p-5">
                    <div className={`h-6 w-4/5 ${bar}`} />
                    <div className={`h-4 w-1/2 ${bar}`} />
                    <div className={`h-4 w-full ${bar}`} />
                    <div className={`h-4 w-5/6 ${bar}`} />
                    <div className="border-t border-edge pt-4">
                      <div className={`h-6 w-28 ${bar}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
