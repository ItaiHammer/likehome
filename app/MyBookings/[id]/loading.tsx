export default function BookingLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <p role="status" className="sr-only">
        Loading your booking…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className={`h-6 w-44 ${block}`} />
        <div className={`mt-6 h-4 w-36 ${block}`} />
        <div className={`mt-3 h-14 w-96 max-w-full ${block}`} />
        <div className={`mt-2 h-6 w-48 ${block}`} />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_514px]">
          <div className="space-y-4">
            <div className={`h-10 w-56 ${block}`} />
            <div className={`h-[92px] ${block}`} />
            <div className={`h-[92px] ${block}`} />
          </div>
          <div className={`h-[520px] ${block}`} />
        </div>
      </div>
    </main>
  );
}
