export default function MyBookingsLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p role="status" className="sr-only">
        Loading your bookings…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className={`h-4 w-28 ${block}`} />
        <div className={`mt-4 h-12 w-80 max-w-full ${block}`} />
        <div className={`mt-3 h-6 w-96 max-w-full ${block}`} />
        <div className="mt-10 grid gap-10 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-4 lg:col-start-2 lg:row-start-1">
            <div className={`h-10 w-64 ${block}`} />
            <div className={`h-44 ${block}`} />
            <div className={`mt-6 h-10 w-56 ${block}`} />
            <div className={`h-[74px] ${block}`} />
            <div className={`h-[74px] ${block}`} />
          </div>
          <div className={`h-96 max-w-sm lg:col-start-1 lg:row-start-1 ${block}`} />
        </div>
      </div>
    </main>
  );
}
