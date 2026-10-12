export default function BookingConfirmedLoading() {
  const block = "rounded-lg bg-disabled";
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p role="status" className="sr-only">
        Loading your booking…
      </p>
      <div aria-hidden className="flex flex-col items-center animate-pulse motion-reduce:animate-none">
        <div className={`h-4 w-40 ${block}`} />
        <div className={`mt-4 h-14 w-[28rem] max-w-full ${block}`} />
        <div className={`mt-4 h-6 w-56 ${block}`} />
        <div className={`mt-3 h-5 w-48 ${block}`} />
        <div className={`mt-10 h-52 w-full ${block}`} />
      </div>
    </main>
  );
}
