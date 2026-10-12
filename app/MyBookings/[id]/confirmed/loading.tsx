export default function BookingConfirmedLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p role="status" className="sr-only">
        Loading your booking…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="flex flex-col items-center rounded-lg border border-edge bg-surface p-6 sm:p-8">
          <div className="h-16 w-16 rounded-full bg-disabled" />
          <div className={`mt-4 h-4 w-40 ${block}`} />
          <div className={`mt-3 h-10 w-[24rem] max-w-full ${block}`} />
          <div className={`mt-3 h-5 w-72 max-w-full ${block}`} />
          <div className={`mt-6 h-10 w-64 ${block}`} />
        </div>
        <div className="mt-6 rounded-lg border border-edge bg-surface p-6">
          <div className={`h-7 w-48 ${block}`} />
          <div className="mt-4 grid gap-6 sm:grid-cols-[12rem_1fr]">
            <div className={`aspect-[4/3] w-full ${block}`} />
            <div className="space-y-3">
              <div className={`h-6 w-2/3 ${block}`} />
              <div className={`h-4 w-1/3 ${block}`} />
              <div className={`h-20 ${block}`} />
            </div>
          </div>
          <div className={`mt-6 h-16 ${block}`} />
        </div>
      </div>
    </main>
  );
}
