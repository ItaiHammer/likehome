"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { browserTimeZone } from "@/app/_components/dates";
import { Button, FormError } from "@/app/_components/ui";
import { DateRangePicker } from "@/app/reserve/[slug]/DateRangePicker";
import { PAGE_ROUTES } from "@/constants/routes";
import { datesProblem } from "@/lib/bookings";
import { todayInTimeZone } from "@/utils/reservation-logic";

type Errors = { dates?: string; form?: string; signIn?: boolean };

const signInHref = `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(PAGE_ROUTES.MY_BOOKINGS)}`;

// Book again: new dates for the same room and guests. POST /api/reservations/[id]/rebook checks the
// stay is still bookable, then checkout opens with it filled in.
export function RebookButton({
  bookingId,
  hotelName,
  sample = false,
}: {
  bookingId: string;
  hotelName: string;
  /** Dev-only sample booking: the check is faked and checkout never opens */
  sample?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [checking, setChecking] = useState(false);
  const [sampleDone, setSampleDone] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sampleTimer = useRef<number | undefined>(undefined);
  const triggerId = `${id}-book-again`;
  const panelId = `${id}-panel`;
  const checkInId = `${id}-check-in`;

  useEffect(
    () => () => {
      request.current?.abort();
      window.clearTimeout(sampleTimer.current);
    },
    [],
  );

  function setExpanded(next: boolean) {
    setErrors({});
    setSampleDone(false);
    setOpen(next);
    setDatesOpen(next);
  }

  function cancel() {
    setExpanded(false);
    document.getElementById(triggerId)?.focus();
  }

  function fail(message: string, signIn = false) {
    setChecking(false);
    setErrors({ form: message, signIn });
  }

  // Back to the calendar, with the reason under the dates. A fresh picker opens on check-in, where
  // focus goes; flushSync renders it (and unlocks it) before the focus call.
  function showDates(message: string) {
    flushSync(() => {
      setChecking(false);
      setErrors({ dates: message });
      setPickerKey((k) => k + 1);
      setDatesOpen(true);
    });
    document.getElementById(checkInId)?.focus({ preventScroll: true });
  }

  async function confirm() {
    if (checking) return;
    const problem = datesProblem(checkIn, checkOut, todayInTimeZone(browserTimeZone()));
    if (problem) return showDates(problem);
    setErrors({});
    setSampleDone(false);
    setDatesOpen(false);
    setChecking(true);

    if (sample) {
      window.clearTimeout(sampleTimer.current);
      sampleTimer.current = window.setTimeout(() => {
        setChecking(false);
        setSampleDone(true);
      }, 700);
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const res = await fetch(`/api/reservations/${bookingId}/rebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_in: checkIn, check_out: checkOut, time_zone: browserTimeZone() }),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; rebook?: { checkout_url?: string } };
      if (controller.signal.aborted) return;
      const error = body.error?.trim();
      if (res.status === 401) return fail("Your sign-in has ended. Sign in again to book this stay.", true);
      // The API's message already says to pick other dates
      if (res.status === 409) return showDates(error || "Those dates aren’t available. Pick other dates.");
      const url = body.rebook?.checkout_url;
      if (!res.ok || !url?.startsWith("/")) return fail(error || "We couldn’t check those dates. Try again.");
      // Stays busy until checkout loads
      router.push(url);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Checking the stay to book again failed", err);
      fail("We couldn’t reach LikeHome. Check your connection and try again.");
    }
  }

  return (
    <>
      <Button id={triggerId} variant="secondary" onClick={() => setExpanded(!open)} disabled={checking} aria-expanded={open} aria-controls={open ? panelId : undefined}>
        Book again<span className="sr-only"> at {hotelName}</span>
      </Button>

      {open && (
        <div id={panelId} className="basis-full border-t border-edge pt-4">
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-slate">Same room and guests as last time. Pick your new dates.</p>

            {/* Locked while checking (and while checkout loads), so the answer is for the dates shown */}
            <fieldset disabled={checking} className="min-w-0">
              <DateRangePicker
                key={pickerKey}
                id={checkInId}
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(a, b) => {
                  setCheckIn(a);
                  setCheckOut(b);
                  setErrors({});
                  setSampleDone(false);
                }}
                blockedOffsets={[]}
                open={datesOpen}
                onOpenChange={setDatesOpen}
                error={errors.dates}
              />
            </fieldset>

            <FormError message={errors.form} signInHref={errors.signIn ? signInHref : undefined} />
            {sampleDone && (
              <p role="status" className="text-sm text-slate">
                That was a sample booking, so checkout doesn’t open. Sign in to book your real stays again.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button loading={checking} onClick={confirm}>
                Confirm
              </Button>
              <Button variant="secondary" onClick={cancel} disabled={checking}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
