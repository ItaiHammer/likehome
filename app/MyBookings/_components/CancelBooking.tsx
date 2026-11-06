"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button, Card } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";
import { formatStayDates, money, type Booking, type CancellationQuote } from "@/lib/bookings";
import { cancelBooking, type CancelResult } from "../actions";

type Target = { booking: Booking; quote: CancellationQuote };
type Done = Extract<CancelResult, { status: "cancelled" | "notCancellable" }>;

const points = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "point" : "points"}`;
const focusOnMount = (el: HTMLElement | null) => el?.focus();
const signInHref = `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(PAGE_ROUTES.MY_BOOKINGS)}`;

const OpenCancelDialog = createContext<((target: Target) => void) | null>(null);

// One dialog for the whole Upcoming list, so it keeps showing the result after the refresh removes the cancelled card.
// A native <dialog> opened with showModal(), like the listings ConfirmDialog: the browser traps focus,
// closes it on Escape and makes the page behind it inert. The database works out the refund; this only shows it.
export function CancelBookingDialog({
  sample = false,
  children,
}: {
  /** Dev-only sample bookings: nothing is cancelled */
  sample?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const termsId = useId();
  const [target, setTarget] = useState<Target | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; signIn: boolean } | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const open = useCallback((next: Target) => {
    // Puts this booking in the dialog before showModal() picks what to focus
    flushSync(() => setTarget(next));
    dialogRef.current?.showModal();
  }, []);

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  // Runs however the dialog closes (Done, Keep reservation, Escape)
  function onClose() {
    if (dialogRef.current?.open) return; // already reopened with the result (see confirm)
    // Here, not in open(): showModal() would focus the old Sign in link just before it disappears
    setError(null);
    setDone(null);
  }

  async function confirm() {
    if (pending || !target) return;
    const { booking, quote } = target;
    setError(null);
    setPending(true);
    const result = sample
      ? await new Promise<CancelResult>((resolve) =>
          window.setTimeout(() => resolve({ status: "cancelled", refund: quote.refund, refundPoints: quote.refundPoints }), 700),
        )
      : await cancelBooking(booking.id).catch((): CancelResult => ({ status: "failed", message: "We couldn’t reach LikeHome. Check your connection and try again." }));
    setPending(false);

    if (result.status === "cancelled" || result.status === "notCancellable") {
      // Now, not when the dialog closes: leaving with Back skips onClose, and Next's cache would show the booking as active
      if (!sample) router.refresh();
      setDone(result);
    } else if (result.status === "signedOut") {
      setError({ message: "Your sign-in has ended. Sign in again to cancel.", signIn: true });
    } else {
      setError({ message: result.message, signIn: false });
    }
    // Browsers let a second Escape close the dialog mid-request, so reopen it to show the result
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  const outcome = done && outcomeText(done, sample);

  return (
    <OpenCancelDialog value={open}>
      {children}

      <dialog
        ref={dialogRef}
        onCancel={(e) => pending && e.preventDefault()}
        onClose={onClose}
        aria-labelledby={titleId}
        aria-describedby={done ? undefined : termsId}
        // Same look as the listings ConfirmDialog
        className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-lg border border-edge bg-surface p-6 text-ink shadow-[0_18px_50px_-30px_rgba(7,13,47,0.4)] backdrop:bg-disabled/90 dark:backdrop:bg-black/60"
      >
        {outcome ? (
          <>
            <h2 id={titleId} ref={focusOnMount} tabIndex={-1} className="text-xl font-semibold outline-none">
              {outcome.title}
            </h2>
            <p className="mt-2 text-slate">{outcome.text}</p>
            <Button onClick={close} className="mt-6">
              Done
            </Button>
          </>
        ) : (
          target && (
            <>
              <h2 id={titleId} className="text-xl font-semibold">
                Cancel this reservation?
              </h2>
              <p className="mt-2 text-slate">
                {target.booking.hotelName} · {formatStayDates(target.booking.checkIn, target.booking.checkOut)}
              </p>
              <CancelTerms id={termsId} quote={target.quote} />

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
    </OpenCancelDialog>
  );
}

function outcomeText(done: Done, sample: boolean): { title: string; text: string } {
  if (done.status === "notCancellable") {
    return {
      title: "This reservation can’t be cancelled anymore.",
      text: "It may already be cancelled, or it’s now too late to cancel online. Your bookings are up to date.",
    };
  }
  if (sample) {
    return {
      title: "That was a sample booking.",
      text: `Nothing was cancelled. A real cancellation would ${done.refundPoints > 0 ? `add ${points(done.refundPoints)} to your account` : "not refund anything"}.`,
    };
  }
  return {
    title: "Your reservation is cancelled.",
    text: done.refundPoints > 0 ? `${points(done.refundPoints)} (worth ${money(done.refund)}) were added to your account.` : "No refund was issued.",
  };
}

// The card's button; it opens the CancelBookingDialog around the Upcoming list
export function CancelBookingButton({
  booking,
  quote,
  className = "",
}: {
  booking: Booking;
  /** What cancelling costs, loaded with the page; null when it couldn't be loaded */
  quote: CancellationQuote | null;
  className?: string;
}) {
  const open = useContext(OpenCancelDialog);
  const reasonId = useId();
  if (!open) throw new Error("CancelBookingButton must be inside a CancelBookingDialog");

  const unavailable = !quote ? "Cancellation isn’t available right now." : !quote.canCancel ? "It’s too late to cancel this reservation online." : null;

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => quote && open({ booking, quote })}
        disabled={!!unavailable}
        aria-describedby={unavailable ? reasonId : undefined}
        className={className}
      >
        Cancel reservation
      </Button>
      {/* w-0 min-w-full: a full row under the buttons that never widens the button column */}
      {unavailable && (
        <p id={reasonId} className="w-0 min-w-full text-sm text-slate">
          {unavailable}
        </p>
      )}
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
