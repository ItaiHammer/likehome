import { PageBackdrop } from "@/app/_components/PageBackdrop";

export default function StayLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <p role="status" className="sr-only">
          Loading this stay…
        </p>
        <div aria-hidden className="animate-pulse motion-reduce:animate-none">
          <div className={`h-5 w-32 ${block}`} />
          <div className={`mt-4 h-12 w-[28rem] max-w-full sm:h-16 ${block}`} />
          <div className={`mt-2 h-5 w-56 ${block}`} />
          <div className={`mt-6 h-64 w-full rounded-2xl sm:h-96 ${block}`} />
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_514px]">
            <div className="space-y-4">
              <div className={`h-10 w-56 ${block}`} />
              <div className={`h-28 ${block}`} />
              <div className={`h-28 ${block}`} />
            </div>
            <div className={`h-96 rounded-2xl ${block}`} />
          </div>
        </div>
      </main>
    </div>
  );
}
