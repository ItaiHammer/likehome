import { PageBackdrop } from "@/app/_components/PageBackdrop";

const block = "rounded-lg bg-disabled";

/** The hub's or a message's outline while it loads */
export function MessagesSkeleton({ rows }: { rows: number }) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p role="status" className="sr-only">
          Loading your messages…
        </p>
        <div aria-hidden className="animate-pulse motion-reduce:animate-none">
          <div className={`h-5 w-28 ${block}`} />
          <div className={`mt-3 h-12 w-72 max-w-full ${block}`} />
          <div className={`mt-3 h-6 w-80 max-w-full ${block}`} />
          <div className="mx-auto mt-8 max-w-[900px] rounded-[10px] border-2 border-edge bg-surface sm:mt-10">
            {rows > 0 ? (
              <>
                <div className="flex justify-end border-b border-edge px-4 py-5 sm:px-14">
                  <div className={`h-[35px] w-[116px] ${block}`} />
                </div>
                <div className="space-y-6 px-4 py-6 sm:px-14">
                  {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="space-y-2">
                      <div className={`h-4 w-48 ${block}`} />
                      <div className={`h-4 w-64 max-w-full ${block}`} />
                      <div className={`h-4 w-full max-w-[570px] ${block}`} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3 px-5 py-10 sm:px-[47px]">
                <div className={`h-4 w-40 ${block}`} />
                <div className={`h-4 w-full ${block}`} />
                <div className={`h-4 w-5/6 ${block}`} />
                <div className={`h-4 w-2/3 ${block}`} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
