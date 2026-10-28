"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button, Card } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { formatStayDates, money, type Booking, type CancellationQuote } from "@/lib/bookings";
import { cancelBooking, type CancelResult } from "../actions";

const points = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "point" : "points"}`;
const focusOnMount = (el: HTMLElement | null) => el?.focus();
const signInHref = `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(PAGE_ROUTES.MY_BOOKINGS)}`;

// A native <dialog> opened with showModal(), like the listings ConfirmDialog: the browser traps focus,
// closes it on Escape and makes the page behind it inert. The database works out the refund; this only shows it.
export function CancelBooking({
  booking,
  quote,
  sample = false,
  className = "",
}: {
  booking: Booking;
  /** What cancelling costs, loaded with the page; null when it couldn't be loaded */
  quote: CancellationQuote | null;
  /** Dev-only sample booking: nothing is cancelled */
  sample?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const termsId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; signIn: boolean } | null>(null);
  const [done, setDone] = useState<{ refund: number; refundPoints: number } | null>(null);

  const unavailable = !quote ? "Cancellation isn’t available right now." : !quote.canCancel ? "It’s too late to cancel this reservation online." : null;

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  // Runs however the dialog closes (Done, Keep reservation, Escape)
  function onClose() {
    if (!done) return;
    if (sample) setDone(null);
    else router.refresh(); // moves the booking to "Cancelled reservations"
  }

  async function confirm() {
    if (pending || !quote) return;
    setError(null);
    setPending(true);
    const result = sample
      ? await new Promise<CancelResult>((resolve) =>
          window.setTimeout(() => resolve({ status: "cancelled", refund: quote.refund, refundPoints: quote.refundPoints }), 700),
        )
      : await cancelBooking(booking.id).catch((): CancelResult => ({ status: "failed", message: "We couldn’t reach LikeHome. Check your connection and try again." }));
    setPending(false);

    if (result.status === "cancelled") {
      // Some browsers let a second Escape close the dialog mid-request, and then nobody presses Done
      if (dialogRef.current?.open) setDone({ refund: result.refund, refundPoints: result.refundPoints });
      else if (!sample) router.refresh();
    } else if (result.status === "signedOut") {
      setError({ message: "Your sign-in has ended. Sign in again to cancel.", signIn: true });
    } else {
      setError({ message: result.message, signIn: false });
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={open} disabled={!!unavailable} title={unavailable ?? undefined} className={className}>
        Cancel reservation
      </Button>

      <dialog
        ref={dialogRef}
        onCancel={(e) => pending && e.preventDefault()}
        onClose={onClose}
        aria-labelledby={titleId}
        aria-describedby={done ? undefined : termsId}
        // Same look as the listings ConfirmDialog
        className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-edge bg-surface p-6 text-ink shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop:bg-disabled/90 dark:backdrop:bg-black/60"
      >
        {done ? (
          <>
            <h2 id={titleId} ref={focusOnMount} tabIndex={-1} className="text-xl font-semibold outline-none">
              {sample ? "That was a sample booking." : "Your reservation is cancelled."}
            </h2>
            <p className="mt-2 text-slate">
              {sample
                ? `Nothing was cancelled. A real cancellation would ${done.refundPoints > 0 ? `add ${points(done.refundPoints)} to your account` : "not refund anything"}.`
                : done.refundPoints > 0
                  ? `${points(done.refundPoints)} (worth ${money(done.refund)}) were added to your account.`
                  : "No refund was issued."}
            </p>
            <Button onClick={close} className="mt-6">
              Done
            </Button>
          </>
        ) : (
          quote && (
            <>
              <h2 id={titleId} className="text-xl font-semibold">
                Cancel this reservation?
              </h2>
              <p className="mt-2 text-slate">
                {booking.hotelName} · {formatStayDates(booking.checkIn, booking.checkOut)}
              </p>
              <CancelTerms id={termsId} quote={quote} />

              {error && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {error.message}
                  {error.signIn && (
                    <>
                      {" "}
                      <Link href={signInHref} className="font-semibold underline">
                        Sign in
                      </Link>
                    </>
                  )}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={close} aria-disabled={pending || undefined}>
                  Keep reservation
                </Button>
                <Button variant="secondary" onClick={confirm} loading={pending}>
                  Cancel reservation
                </Button>
              </div>
            </>
          )
        )}
      </dialog>
    </>
  );
}

function CancelTerms({ id, quote }: { id: string; quote: CancellationQuote }) {
  if (quote.bookingPaid <= 0) {
    return (
      <Card tone="tint" padding="none" className="mt-5 p-4 text-sm">
        <div id={id}>
          <p className="font-semibold text-ink">Nothing to refund</p>
          <p className="mt-1 text-slate">You haven’t been charged for this reservation.</p>
        </div>
      </Card>
    );
  }

  if (quote.hasInsurance) {
    return (
      <Card tone="tint" padding="none" className="mt-5 p-4 text-sm">
        <div id={id}>
          <p className="font-semibold text-ink">You have cancellation insurance</p>
          <p className="mt-1 text-slate">
            You’ll get {points(quote.refundPoints)} (worth {money(quote.refund)}), the full amount you paid for this stay.
            {quote.insurancePaid > 0 && ` The ${money(quote.insurancePaid)} insurance fee isn’t refunded.`}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div id={id} className="mt-5 rounded-lg border border-danger/35 p-4 text-sm">
      <p className="font-semibold text-danger">No cancellation insurance</p>
      <p className="mt-1 text-slate">
        Because this reservation isn’t insured, cancelling it means losing the {money(quote.bookingPaid)} you paid. You won’t get a refund or points.
      </p>
    </div>
  );
}
