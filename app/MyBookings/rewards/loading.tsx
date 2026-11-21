export default function RewardsLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p role="status" className="sr-only">
        Loading your rewards…
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className={`h-4 w-28 ${block}`} />
        <div className={`mt-4 h-12 w-80 max-w-full ${block}`} />
        <div className={`mt-3 h-6 w-96 max-w-full ${block}`} />
        <div className="mt-10 grid gap-6 lg:grid-cols-[318px_minmax(0,1fr)]">
          <div className={`h-64 ${block}`} />
          <div className={`h-64 ${block}`} />
        </div>
        <div className={`mt-14 h-10 w-56 ${block}`} />
        <div className={`mt-6 h-60 ${block}`} />
      </div>
    </main>
  );
}
