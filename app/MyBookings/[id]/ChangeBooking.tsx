"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PAGE_ROUTES } from "@/constants/routes";
import { bookingCode, changeBlocker, datesProblem, findOverlap, formatStayDates, money, overlapMessage, TOO_CLOSE_TO_CHANGE, type OtherStay } from "@/lib/bookings";
import { calculateTotalPrice, MAX_NIGHTS, todayInTimeZone } from "@/utils/reservation-logic";
import { browserTimeZone, formatDate, nightsBetween } from "../../_components/dates";
import { isMotionReduced } from "../../_components/motion";
import { buttonPrimary, buttonSecondary, FormError, Stepper } from "../../_components/ui";
import type { Room } from "../../_data/stays";
import { DateRangePicker } from "../../reserve/[slug]/DateRangePicker";
import { RoomOptions } from "../../reserve/[slug]/RoomOptions";
import { HotelPhoto } from "../_components/HotelPhoto";

export type BookingToChange = {
  id: string;
  hotelName: string;
  location: string;
  photoUrl: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomId: string;
  total: number;
  /** Why the booking can't be changed, or null when it can */
  blocker: string | null;
};

type Stay = { checkIn: string; checkOut: string; guests: number; roomId: string; total: number };
type Errors = { dates?: string; guests?: string; form?: string; signIn?: boolean };

const nightsLabel = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;
const guestsLabel = (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`;

// Change the dates, room or guests of a booking through PATCH /api/reservations/[id].
// The API reprices the stay (nights × nightly price); no difference is charged or refunded yet.
export function ChangeBooking({
  booking,
  rooms,
  otherStays,
  sample = false,
}: {
  booking: BookingToChange;
  /** The hotel's rooms; the booking can move to any of them */
  rooms: Room[];
  /** The guest's bookings at other hotels, which the new dates can't overlap */
  otherStays: OtherStay[];
  /** Dev-only sample booking: changes are shown, never saved */
  sample?: boolean;
}) {
  const router = useRouter();
  // From the first load only: the refresh after a save mustn't swap the confirmation for the read-only view
  const [blocker] = useState(booking.blocker);
  // What's booked now; it becomes the saved booking after each change
  const [current, setCurrent] = useState<Stay>(() => ({
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    roomId: booking.roomId,
    total: booking.total,
  }));
  const [checkIn, setCheckIn] = useState(booking.checkIn);
  const [checkOut, setCheckOut] = useState(booking.checkOut);
  const [guests, setGuests] = useState(booking.guests);
  const [roomId, setRoomId] = useState(booking.roomId);
  const [datesOpen, setDatesOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sampleTimer = useRef<number | undefined>(undefined);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastDone = useRef(done);

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const currentRoom = rooms.find((r) => r.id === current.roomId);
  const nights = nightsBetween(checkIn, checkOut);
  const changed = checkIn !== current.checkIn || checkOut !== current.checkOut || guests !== current.guests || roomId !== current.roomId;
  // Any change is repriced at today's nightly price (the API does the same), so until something
  // changes the booked room shows what was actually booked
  const priceFor = (r: Room) => (!changed && r.id === current.roomId ? current.total : calculateTotalPrice(checkIn, checkOut, r.nightly));
  const total = room ? priceFor(room) : 0;
  const difference = Math.round((total - current.total) * 100) / 100;
  const maxGuests = Math.max(1, ...rooms.map((r) => r.sleeps));
  const backHref = sample ? `${PAGE_ROUTES.MY_BOOKINGS}?sample` : PAGE_ROUTES.MY_BOOKINGS;

  // Moving between the form and the saved view: bring the card into view and focus its heading
  useEffect(() => {
    if (lastDone.current === done) return;
    lastDone.current = done;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: isMotionReduced() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [done]);

  useEffect(
    () => () => {
      request.current?.abort();
      window.clearTimeout(sampleTimer.current);
    },
    [],
  );

  if (blocker || !room || !currentRoom) {
    return (
      <ReadOnlyBooking
        booking={booking}
        backHref={backHref}
        roomName={currentRoom?.name ?? null}
        reason={blocker ?? "This room isn’t listed anymore, so the booking can’t be changed online."}
      />
    );
  }

  // The same rules the API checks, so problems show on the card before saving
  function problem(): { field: "dates" | "guests"; message: string } | null {
    // The guest's today; the API judges it the same way from the time_zone sent with the change
    const dates = datesProblem(checkIn, checkOut, todayInTimeZone(browserTimeZone()));
    if (dates) return { field: "dates", message: dates };
    const clash = findOverlap(otherStays, checkIn, checkOut);
    if (clash) return { field: "dates", message: overlapMessage(clash) };
    if (guests > room.sleeps) return { field: "guests", message: `${room.name} sleeps up to ${room.sleeps}. Pick a bigger room or fewer guests.` };
    return null;
  }

  function fail(message: string, signIn = false) {
    setSaving(false);
    setErrors({ form: message, signIn });
  }

  function finish(saved: Stay) {
    setCurrent(saved);
    setSaving(false);
    setDone(true);
  }

  async function save() {
    if (saving) return;
    const found = problem();
    if (found) {
      setErrors({ [found.field]: found.message });
      if (found.field === "dates") setDatesOpen(true);
      return;
    }
    if (!changed) return;
    setErrors({});
    setDatesOpen(false);
    setSaving(true);
    const next = { checkIn, checkOut, guests, roomId, total };

    if (sample) {
      window.clearTimeout(sampleTimer.current);
      sampleTimer.current = window.setTimeout(() => finish(next), 700);
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const res = await fetch(`/api/reservations/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, check_in: checkIn, check_out: checkOut, guests, time_zone: browserTimeZone() }),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; reservation?: { total_price?: number | string | null } | null };
      const error = body.error?.trim();
      if (res.status === 401) return fail("Your sign-in has ended. Sign in again to save your changes.", true);
      if (res.status === 409) return fail(`${error ?? "Those dates aren’t available."} Pick other dates.`);
      // The API's own wording ("Reservation for past dates…") reads oddly here
      if (res.status === 422) return fail(TOO_CLOSE_TO_CHANGE);
      if (!res.ok || !body.reservation) return fail(error || "We couldn’t save your changes. Try again.");

      const savedTotal = Number(body.reservation.total_price);
      // The saved total, in case the server priced it differently from the card
      finish({ ...next, total: body.reservation.total_price != null && Number.isFinite(savedTotal) ? savedTotal : total });
      // Clears Next's back/forward cache, which would otherwise bring back the old booking on Back
      router.refresh();
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Saving the booking change failed", err);
      fail("We couldn’t reach LikeHome. Check your connection and try again.");
    }
  }

  function changeAgain() {
    setErrors({});
    setDone(false);
  }

  // A change can move check-in to today, after which the API refuses further changes
  const againBlocker = done ? changeBlocker({ status: "confirmed", checkIn: current.checkIn, checkOut: current.checkOut }, todayInTimeZone(browserTimeZone())) : null;
  const signInHref = `${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(`${PAGE_ROUTES.MY_BOOKINGS}/${booking.id}`)}`;
  const locked = done || saving;

  return (
    <>
      <BookingHeader booking={booking} backHref={backHref} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_514px] lg:items-start">
        <fieldset id="rooms" disabled={locked} aria-describedby={done ? "rooms-locked" : undefined} className="min-w-0 scroll-mt-6">
          <legend className="text-[32px] font-bold leading-10 text-ink">
            <h2>Choose a room</h2>
          </legend>
          {done && (
            <p id="rooms-locked" className="mt-2 text-sm text-slate">
              Your room is saved. To change it again, choose Make another change.
            </p>
          )}
          <RoomOptions
            rooms={rooms}
            selectedId={roomId}
            onSelect={(id) => {
              setRoomId(id);
              setErrors(({ dates }) => ({ dates }));
            }}
            locked={locked}
            note={(r) =>
              [r.id === current.roomId && "Your room now", nights > 0 && `${money(priceFor(r))} for ${nightsLabel(nights)}`]
                .filter(Boolean)
                .join(" · ")
            }
          />
        </fieldset>

        <aside ref={cardRef} aria-label="Change your booking" className={`scroll-mt-6 rounded-2xl border border-edge bg-surface p-5 sm:p-6 lg:p-7 ${done ? "" : "lg:sticky lg:top-6"}`}>
          {!done ? (
            <div className="space-y-5">
              <h2 ref={headingRef} tabIndex={-1} className="text-[32px] font-bold leading-10 text-ink outline-none">
                Change your booking
              </h2>

              <div className="flex gap-4 rounded-control border border-edge bg-paper p-4">
                <HotelPhoto url={booking.photoUrl} className="aspect-square w-16" />
                <div className="min-w-0 text-sm text-slate">
                  <p className="text-base font-semibold leading-5 text-ink">Booked now</p>
                  <p className="mt-1">
                    {formatStayDates(current.checkIn, current.checkOut)} · {nightsLabel(nightsBetween(current.checkIn, current.checkOut))}
                  </p>
                  <p>
                    {currentRoom.name} · {guestsLabel(current.guests)} · {money(current.total)}
                  </p>
                </div>
              </div>

              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(a, b) => {
                  setCheckIn(a);
                  setCheckOut(b);
                  setErrors(({ guests: g }) => ({ guests: g }));
                }}
                blockedOffsets={[]}
                open={datesOpen}
                onOpenChange={setDatesOpen}
                error={errors.dates}
              />

              <div>
                <div className={`rounded-control border px-4 ${errors.guests ? "border-danger" : "border-edge"}`}>
                  <Stepper
                    label="Guests"
                    hint={`${room.name} sleeps up to ${room.sleeps}`}
                    value={guests}
                    min={1}
                    max={maxGuests}
                    onChange={(n) => {
                      setGuests(n);
                      setErrors(({ dates }) => ({ dates }));
                    }}
                  />
                </div>
                {errors.guests && (
                  <p role="alert" className="mt-1.5 text-sm text-danger">
                    {errors.guests}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 text-base">
                <span className="text-slate">Room</span>
                <span className="flex items-baseline gap-3">
                  <span className="font-semibold text-ink">{room.name}</span>
                  <a href="#rooms" className="text-base font-semibold text-blue hover:text-blue-dark">
                    Change
                  </a>
                </span>
              </div>

              {!changed ? (
                <dl className="text-base">
                  <div className="flex justify-between font-bold text-ink">
                    <dt>Total</dt>
                    <dd>{money(current.total)}</dd>
                  </div>
                </dl>
              ) : nights > 0 ? (
                <dl className="space-y-2 text-base">
                  <div className="flex justify-between text-slate">
                    <dt>
                      {money(room.nightly)} × {nightsLabel(nights)}
                    </dt>
                    <dd className="text-ink">{money(total)}</dd>
                  </div>
                  {difference !== 0 && (
                    <div className="flex justify-between text-slate">
                      <dt>Was {money(current.total)}</dt>
                      <dd className="text-ink">{difference > 0 ? `+${money(difference)}` : `−${money(-difference)}`}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-edge pt-3 text-base font-bold text-ink">
                    <dt>New total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate">Add your dates to see the new total.</p>
              )}

              <FormError message={errors.form} signInHref={errors.signIn ? signInHref : undefined} />

              {/* aria-disabled while saving (not disabled), so a focused button keeps focus */}
              <button type="button" onClick={save} disabled={!changed} aria-disabled={saving || undefined} className={`${buttonPrimary} w-full`}>
                {saving ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
              <p className="text-center text-sm text-slate">
                {!changed ? "Change your dates, room or guests, then save." : difference !== 0 ? "Price changes aren’t charged or refunded yet." : "Your price stays the same."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-[32px] font-bold leading-10 text-ink outline-none">
                  {sample ? "That was a sample booking." : "Your booking is updated."}
                </h2>
                <p className="mt-2 text-base text-slate">
                  {sample ? (
                    "Nothing was saved. Sign in to change your real bookings."
                  ) : (
                    <>
                      Booking <span className="font-semibold text-ink">{bookingCode(booking.id)}</span> now has these details.
                    </>
                  )}
                </p>
              </div>
              <StayDetails roomName={room.name} stay={current} />
              <Link href={backHref} className={`${buttonPrimary} w-full`}>
                Back to My Bookings
              </Link>
              {againBlocker ? (
                <p className="text-center text-sm text-slate">{againBlocker}</p>
              ) : (
                <button type="button" onClick={changeAgain} className={`${buttonSecondary} w-full`}>
                  Make another change
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function BookingHeader({ booking, backHref }: { booking: BookingToChange; backHref: string }) {
  return (
    <>
      {/* Ink, not blue, even on hover: blue text on the sky strip is too faint to read */}
      <Link href={backHref} className="group inline-flex items-center gap-1 text-base font-semibold text-ink">
        <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">
          ←
        </span>{" "}
        Back to My Bookings
      </Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.08em] text-ink">Booking {bookingCode(booking.id)}</p>
      <h1 className="mt-2 break-words text-balance font-serif text-[40px] leading-[48px] text-ink sm:text-[56px] sm:leading-[64px]">{booking.hotelName}</h1>
      {booking.location && <p className="mt-1 text-base text-ink">{booking.location}</p>}
    </>
  );
}

function ReadOnlyBooking({ booking, backHref, roomName, reason }: { booking: BookingToChange; backHref: string; roomName: string | null; reason: string }) {
  return (
    <>
      <BookingHeader booking={booking} backHref={backHref} />
      <section className="mt-10 max-w-xl space-y-5 rounded-2xl border border-edge bg-surface p-5 sm:p-6 lg:p-7">
        <p role="status" className="flex gap-2 text-base text-ink">
          <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-blue" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 7.5v.5" strokeLinecap="round" />
          </svg>
          {reason}
        </p>
        <StayDetails roomName={roomName} stay={booking} />
        <Link href={backHref} className={`${buttonPrimary} w-full`}>
          Back to My Bookings
        </Link>
      </section>
    </>
  );
}

function StayDetails({ roomName, stay }: { roomName: string | null; stay: Stay }) {
  const rows = [
    roomName && ["Room", roomName],
    ["Check-in", formatDate(stay.checkIn)],
    ["Check-out", formatDate(stay.checkOut)],
    ["Guests", guestsLabel(stay.guests)],
    ["Total", money(stay.total)],
  ].filter(Boolean) as [string, string][];
  return (
    <dl className="space-y-3 border-y border-edge py-4 text-base">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-slate">{label}</dt>
          <dd className="text-right font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
