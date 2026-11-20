import { PageBackdrop } from "@/app/_components/PageBackdrop";

export default function MessagesLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p role="status" className="sr-only">
          Loading your messages…
        </p>
        <div aria-hidden className="animate-pulse motion-reduce:animate-none">
          <div className={`h-12 w-56 max-w-full ${block}`} />
          <div className={`mt-3 h-6 w-96 max-w-full ${block}`} />
          <div className="mt-10 grid gap-6 md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[24rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className={`h-7 w-24 ${block}`} />
              <div className={`h-[92px] ${block}`} />
              <div className={`h-[92px] ${block}`} />
              <div className={`h-[92px] ${block}`} />
            </div>
            <div className={`hidden h-96 md:block ${block}`} />
          </div>
        </div>
      </main>
    </div>
  );
}
