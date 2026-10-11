"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_NIGHTS, todayUTC } from "@/utils/reservation-logic";
import { addDays, formatDate, formatShort, nightsBetween, todayISO } from "../../_components/dates";
import { isMotionReduced } from "../../_components/motion";
import { buttonPrimary, buttonSecondary, Field, Stars } from "../../_components/ui";
import { getFacts } from "../../_data/facts";
import { TAX_RATE, type Stay } from "../../_data/stays";
import { DateRangePicker } from "./DateRangePicker";
import { FactTags } from "./FactTags";
import { GuestsField, guestLabel } from "./GuestsField";
import { PhotoGallery } from "./PhotoGallery";

type Step = "stay" | "details" | "done";
type Errors = Partial<Record<string, string>>;
type Popover = "dates" | "guests" | null;
type Contact = { firstName: string; lastName: string; email: string; phone: string };
// What was confirmed, frozen at the moment of confirming (later edits can't change it)
type Booking = {
  confirmation: string;
  email: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  total: number;
  /** false for the sample stays, which can't be saved */
  saved: boolean;
};

/** Room, dates and guests to start the card with, e.g. when coming back from sign-in */
export type StayChoices = { checkIn?: string; checkOut?: string; adults?: number; children?: number; roomId?: string };

type StayProblem = { field: "dates" | "guests"; message: string };

const noSubscribe = () => () => {};

const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone"] as const;

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// One page: photos, fact tags, rooms, and a booking card that walks through
// dates and guests → your details and payment → confirmation.
export function StayReservation({
  stay,
  account,
  initial = {},
}: {
  stay: Stay;
  /** The signed-in guest, or null when signed out (booking needs an account) */
  account: { email: string } | null;
  initial?: StayChoices;
}) {
  const router = useRouter();
  const facts = stay.facts ?? getFacts(stay);
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? "");
  const [adults, setAdults] = useState(initial.adults ?? 2);
  const [children, setChildren] = useState(initial.children ?? 0);
  // Start on the first open room that fits the default 2 guests, not just the cheapest one
  const [roomId, setRoomId] = useState(
    () =>
      initial.roomId ??
      (stay.rooms.find((r) => !r.soldOut && r.sleeps >= 2) ?? stay.rooms.find((r) => !r.soldOut) ?? stay.rooms[0]).id,
  );
  const [popover, setPopover] = useState<Popover>(null);
  const [step, setStep] = useState<Step>("stay");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  // Contact details survive going back to change the stay (card details aren't kept)
  const [contact, setContact] = useState<Contact>({ firstName: "", lastName: "", email: "", phone: "" });
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmTimer = useRef<number | undefined>(undefined);
  const saveRequest = useRef<AbortController | null>(null);
  const lastStep = useRef(step);
  // After Reserve, the room list is locked until the guest goes back to their stay
  const roomsLocked = step !== "stay";

  const room = stay.rooms.find((r) => r.id === roomId)!;
  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = room.nightly * nights;
  const cleaning = nights ? stay.cleaningFee : 0;
  const taxes = Math.round((subtotal + cleaning) * (stay.taxRate ?? TAX_RATE));
  const total = subtotal + cleaning + taxes;
  const guests = adults + children;
  // Free cancellation ends 2 days before check-in; for a stay that starts sooner, it's already over.
  // Today is "" while rendering on the server, so the server and the browser agree on first render.
  const today = useSyncExternalStore(noSubscribe, todayISO, () => "");
  const cancelBy = checkIn ? addDays(checkIn, -2) : "";
  const freeCancel = !checkIn || !today || cancelBy > today;

  const setDatesOpen = useCallback((open: boolean) => setPopover((p) => (open ? "dates" : p === "dates" ? null : p)), []);
  const setGuestsOpen = useCallback((open: boolean) => setPopover((p) => (open ? "guests" : p === "guests" ? null : p)), []);

  // When the card changes step, bring it into view and move focus to its heading.
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: isMotionReduced() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // A confirmation still pending when the page goes away shouldn't fire later
  useEffect(
    () => () => {
      window.clearTimeout(confirmTimer.current);
      saveRequest.current?.abort();
    },
    [],
  );

  const clear = (name: string) =>
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });

  // What's wrong with the stay as chosen, if anything. Checked on Reserve and
  // again right before confirming.
  function stayProblem(): StayProblem | null {
    if (!nights) return { field: "dates", message: "" };
    if (nights > MAX_NIGHTS) return { field: "dates", message: `Stays can be up to ${MAX_NIGHTS} nights.` };
    const booked = stay.blockedNights.map((o) => addDays(todayISO(), o));
    if (booked.some((night) => night >= checkIn && night < checkOut)) return { field: "dates", message: "Some of those nights are already booked." };
    // The booking API counts days in UTC, so in the US evening "today" has already passed for it
    if (stay.bookable && checkIn < todayUTC()) return { field: "dates", message: "That check-in date is too soon to book. Pick a later date." };
    if (room.soldOut) return { field: "guests", message: `${room.name} is sold out. Pick another room.` };
    if (guests > room.sleeps) return { field: "guests", message: `${room.name} sleeps up to ${room.sleeps}. Pick a bigger room or fewer guests.` };
    return null;
  }

  function showStayProblem(problem: StayProblem) {
    setStep("stay");
    if (problem.field === "dates") {
      setErrors(problem.message ? { dates: problem.message } : {});
      setPopover("dates");
      return;
    }
    setErrors({ guests: problem.message });
    document.getElementById("guests")?.focus();
  }

  // Sign-in, then straight back to this stay with the same room, dates and guests picked
  function signInHref() {
    const back = new URLSearchParams({ room: room.id, adults: String(adults), children: String(children) });
    if (checkIn && checkOut) {
      back.set("checkIn", checkIn);
      back.set("checkOut", checkOut);
    }
    return `/auth/login?next=${encodeURIComponent(`/reserve/${stay.slug}?${back}`)}`;
  }

  function reserve() {
    const problem = stayProblem();
    if (problem) return showStayProblem(problem);
    if (!account) return router.push(signInHref());
    setErrors({});
    setPopover(null);
    setStep("details");
  }

  // Remember what's typed in the contact fields before the form goes away
  function saveContact() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setContact(Object.fromEntries(CONTACT_FIELDS.map((k) => [k, String(data.get(k) ?? "")])) as Contact);
  }

  function backToStay() {
    // Cancels a sample stay's pretend confirmation; going back is disabled while a real booking saves
    window.clearTimeout(confirmTimer.current);
    saveRequest.current?.abort();
    setSubmitting(false);
    saveContact();
    setErrors({});
    setStep("stay");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const next: Errors = {};

    if (!text("firstName")) next.firstName = "Enter your first name.";
    if (!text("lastName")) next.lastName = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(text("email"))) next.email = "Enter a valid email address.";
    if (!/^\d{13,19}$/.test(text("cardNumber").replace(/\s/g, ""))) next.cardNumber = "Enter a valid card number.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(text("expiry"))) next.expiry = "Use the format MM/YY.";
    if (!/^\d{3,4}$/.test(text("cvc"))) next.cvc = "Enter the 3 or 4 digit code.";
    if (!text("cardName")) next.cardName = "Enter the name on your card.";
    if (!text("postalCode")) next.postalCode = "Enter your billing postal code.";

    setErrors(next);
    const firstError = Object.keys(next)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    // Re-check the stay itself (room, dates, guests) right before confirming
    const problem = stayProblem();
    if (problem) {
      saveContact();
      return showStayProblem(problem);
    }

    saveContact();
    // Freeze exactly what's being confirmed; the confirmation shows this, not live state
    const snapshot = { email: text("email"), roomName: room.name, checkIn, checkOut, adults, children, total };
    setSubmitting(true);

    if (!stay.bookable) {
      // The sample stays aren't in the database, so their booking is only shown, never saved
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => {
        setBooking({ ...snapshot, saved: false, confirmation: `LH-${Math.random().toString(36).slice(2, 8).toUpperCase()}` });
        setSubmitting(false);
        setStep("done");
      }, 900);
      return;
    }

    saveRequest.current?.abort();
    const request = new AbortController();
    saveRequest.current = request;
    void saveBooking(snapshot, request.signal);
  }

  async function saveBooking(snapshot: Omit<Booking, "confirmation" | "saved">, signal: AbortSignal) {
    const fail = (message: string, signIn = false) => {
      setSubmitting(false);
      setErrors(signIn ? { form: message, signIn: "yes" } : { form: message });
    };
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: room.id, check_in: snapshot.checkIn, check_out: snapshot.checkOut, guests: snapshot.adults + snapshot.children }),
        signal,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; reservation?: { id?: string; total_price?: number | string } };
      if (res.status === 401) return fail("Your sign-in has ended. Sign in again to finish booking.", true);
      if (res.status === 409) return fail(`${body.error ?? "Those dates were just booked."} Go back and pick other dates.`);
      if (!res.ok || !body.reservation) return fail(body.error ?? "We couldn’t save your booking. Try again.");

      const { id, total_price } = body.reservation;
      const savedTotal = Number(total_price);
      setBooking({
        ...snapshot,
        saved: true,
        // The saved total, in case the server priced it differently from the card
        total: Number.isFinite(savedTotal) && total_price !== null ? savedTotal : snapshot.total,
        confirmation: id ? `LH-${id.slice(0, 8).toUpperCase()}` : "LH-SAVED",
      });
      setSubmitting(false);
      setStep("done");
    } catch (err) {
      if (signal.aborted) return;
      console.error("Saving the booking failed", err);
      fail("We couldn’t reach LikeHome. Check your connection and try again.");
    }
  }

  function startOver() {
    setCheckIn("");
    setCheckOut("");
    setErrors({});
    setBooking(null);
    setStep("stay");
  }

  return (
    <>
      {/* Ink, not blue, even on hover: blue text on the sky strip is too faint to read */}
      <Link href="/search" className="group inline-flex items-center gap-1 text-base font-semibold text-ink">
        <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">←</span> Back to stays
      </Link>

      <div className="mt-4">
        <h1 className="break-words text-balance font-serif text-[40px] leading-[48px] text-ink sm:text-[56px] sm:leading-[64px]">{stay.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate">
          <span>{stay.location}</span>
          {stay.rating !== null && (
            <>
              <span aria-hidden>·</span>
              <Stars rating={stay.rating} reviews={stay.reviews} />
            </>
          )}
        </p>
      </div>

      <PhotoGallery stayName={stay.name} photos={stay.photos} />

      <FactTags groups={facts} stayName={stay.name} location={stay.location} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_514px] lg:items-start">
        <fieldset id="rooms" disabled={roomsLocked} aria-describedby={roomsLocked ? "rooms-locked" : undefined} className="min-w-0 scroll-mt-6">
          <legend className="text-[32px] font-bold leading-10 text-ink">
            <h2>Choose a room</h2>
          </legend>
          {roomsLocked && (
            <p id="rooms-locked" className="mt-2 text-sm text-slate">
              {step !== "done" ? "To change rooms, go back to your stay." : booking?.saved ? "Your room is booked." : "Sample stay, so nothing was booked."}
            </p>
          )}
          <div className="mt-5 space-y-4">
            {stay.rooms.map((r) => {
              const on = r.id === roomId;
              const off = !!r.soldOut;
              return (
                <label
                  key={r.id}
                  // Room options follow the sheet's field states: default, selected (focus look), disabled.
                  // Keyboard focus always lands on the selected room, so it needs the outline on top.
                  className={`flex items-center gap-4 rounded-control border p-4 transition sm:gap-6 sm:px-5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue ${
                    off
                      ? "cursor-not-allowed border-disabled bg-disabled"
                      : on
                        ? `border-blue bg-surface ring-1 ring-blue ${roomsLocked ? "cursor-default" : "cursor-pointer"}`
                        : roomsLocked
                          ? "cursor-not-allowed border-edge bg-surface opacity-60"
                          : "cursor-pointer border-edge bg-surface hover:border-blue"
                  }`}
                >
                  <input
                    type="radio"
                    name="room"
                    value={r.id}
                    checked={on}
                    disabled={off}
                    onChange={() => {
                      setRoomId(r.id);
                      clear("guests");
                    }}
                    className="sr-only"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-base font-semibold leading-5 ${off ? "text-slate" : "text-ink"}`}>{r.name}</p>
                    <p className="mt-1 text-sm text-slate">
                      {/* Each dot is glued to the label after it, so a wrapped line never ends on a dot */}
                      {[...r.description.split(" · ").filter(Boolean), `Sleeps ${r.sleeps}`].map((part, i) => (
                        <Fragment key={part}>
                          {i > 0 && " "}
                          <span className="whitespace-nowrap">
                            {i > 0 && "· "}
                            {part}
                          </span>
                        </Fragment>
                      ))}
                    </p>
                    <p className="text-sm text-slate">{off ? "Sold out right now" : freeCancel ? "Free cancellation" : "No free cancellation"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-base font-semibold ${off ? "text-slate line-through" : "text-ink"}`}>{money(r.nightly)}</p>
                    <p className="text-sm text-slate">per night</p>
                  </div>
                  <span
                    aria-hidden
                    className={`hidden h-[46px] w-28 shrink-0 items-center justify-center rounded-control text-base font-semibold sm:inline-flex ${
                      off ? "border border-edge text-slate" : on ? "bg-blue text-on-blue" : "border border-edge bg-surface text-ink"
                    }`}
                  >
                    {off ? "Sold out" : on ? "Selected" : "Select"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <aside
          ref={cardRef}
          aria-label="Reserve"
          // Form card from the sheet: white surface, pale blue edge, 50px horizontal inset.
          className={`scroll-mt-6 rounded-2xl border border-edge bg-surface p-5 sm:p-6 lg:p-7 ${step === "stay" ? "lg:sticky lg:top-6" : ""}`}
        >
          {step === "stay" && (
            <div className="space-y-5">
              <h2 ref={headingRef} tabIndex={-1} className="sr-only">
                Your stay
              </h2>
              <div className="flex items-baseline justify-between gap-3">
                <p>
                  <span className="text-[32px] font-bold leading-10 text-ink">{money(room.nightly)}</span>
                  <span className="text-base text-slate"> / night</span>
                </p>
                <p className="truncate text-sm text-slate">{room.name}</p>
              </div>

              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(a, b) => {
                  setCheckIn(a);
                  setCheckOut(b);
                  clear("dates");
                }}
                blockedOffsets={stay.blockedNights}
                open={popover === "dates"}
                onOpenChange={setDatesOpen}
                error={errors.dates}
              />

              <GuestsField
                adults={adults}
                childCount={children}
                onChange={(a, c) => {
                  setAdults(a);
                  setChildren(c);
                  clear("guests");
                }}
                open={popover === "guests"}
                onOpenChange={setGuestsOpen}
                sleeps={room.sleeps}
                error={errors.guests}
              />

              <div className="flex items-center justify-between gap-3 text-base">
                <span className="text-slate">Room</span>
                <span className="flex items-baseline gap-3">
                  <span className="font-semibold text-ink">{room.name}</span>
                  <a href="#rooms" className="text-base font-semibold text-blue hover:text-blue-dark">
                    Change
                  </a>
                </span>
              </div>

              {nights > 0 ? (
                <dl className="space-y-2 text-base">
                  <Line label={`${money(room.nightly)} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={money(subtotal)} />
                  {stay.cleaningFee > 0 && <Line label="Cleaning fee" value={money(cleaning)} />}
                  {taxes > 0 && <Line label="Taxes and fees" value={money(taxes)} />}
                  <div className="flex justify-between border-t border-edge pt-3 text-base font-bold text-ink">
                    <dt>Total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate">Add your dates to see the total for your stay.</p>
              )}

              {!account && (
                <div className="rounded-control border border-blue/30 bg-blue/5 p-4 text-sm text-slate">
                  <p className="text-base font-semibold leading-5 text-ink">Sign in to reserve</p>
                  <p className="mt-1">You need a LikeHome account to book. Pick your room and dates first, and we’ll bring you back here after you sign in.</p>
                </div>
              )}

              <button type="button" onClick={reserve} className={`${buttonPrimary} w-full`}>
                {nights === 0 ? "Check availability" : account ? "Reserve" : "Sign in to reserve"}
              </button>
              <p className="text-center text-sm text-slate">You won’t be charged yet.</p>
            </div>
          )}

          {step === "details" && (
            <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5">
              <button
                type="button"
                onClick={backToStay}
                // Once a real booking is sent the server saves it either way, so going back would hide it
                disabled={submitting && stay.bookable}
                className="inline-flex h-11 items-center gap-1.5 text-base font-semibold text-blue hover:text-blue-dark disabled:cursor-not-allowed disabled:text-slate"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Back to your stay
              </button>
              <h2 ref={headingRef} tabIndex={-1} className="text-[32px] font-bold leading-10 text-ink outline-none">
                Your details
              </h2>
              {account?.email && (
                <p className="text-sm text-slate">
                  Signed in as <span className="font-semibold text-ink">{account.email}</span>
                </p>
              )}

              <div className="rounded-control border border-edge bg-paper p-4 text-sm text-slate">
                <p className="text-base font-semibold leading-5 text-ink">{room.name}</p>
                <p className="mt-1">
                  {formatShort(checkIn)} - {formatShort(checkOut)} · {nights} {nights === 1 ? "night" : "nights"}
                </p>
                <p>{guestLabel(adults, children)}</p>
                <p className="mt-2 flex justify-between text-base font-bold text-ink">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field id="firstName" name="firstName" label="First name" autoComplete="given-name" defaultValue={contact.firstName} error={errors.firstName} onChange={() => clear("firstName")} />
                <Field id="lastName" name="lastName" label="Last name" autoComplete="family-name" defaultValue={contact.lastName} error={errors.lastName} onChange={() => clear("lastName")} />
              </div>
              <Field id="email" name="email" label="Email address" type="email" autoComplete="email" defaultValue={contact.email || account?.email} error={errors.email} onChange={() => clear("email")} />
              <Field id="phone" name="phone" label="Phone (optional)" type="tel" autoComplete="tel" defaultValue={contact.phone} />

              <div className="space-y-5 border-t border-edge pt-5">
                <h3 className="text-base font-semibold leading-5 text-ink">Payment</h3>
                <Field
                  id="cardNumber"
                  name="cardNumber"
                  label="Card number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  error={errors.cardNumber}
                  onChange={(e) => {
                    e.target.value = formatCard(e.target.value);
                    clear("cardNumber");
                  }}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    id="expiry"
                    name="expiry"
                    label="Expiry date"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    error={errors.expiry}
                    onChange={(e) => {
                      e.target.value = formatExpiry(e.target.value);
                      clear("expiry");
                    }}
                  />
                  <Field
                    id="cvc"
                    name="cvc"
                    label="Security code"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="CVC"
                    maxLength={4}
                    error={errors.cvc}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "");
                      clear("cvc");
                    }}
                  />
                </div>
                <Field id="cardName" name="cardName" label="Name on card" autoComplete="cc-name" error={errors.cardName} onChange={() => clear("cardName")} />
                <Field id="postalCode" name="postalCode" label="Billing postal code" autoComplete="postal-code" error={errors.postalCode} onChange={() => clear("postalCode")} />
              </div>

              <p className="text-sm text-slate">
                {freeCancel
                  ? `Free cancellation until ${formatDate(cancelBy)}. After that, the first night is non-refundable.`
                  : "This booking can’t be cancelled for free. The first night is non-refundable."}
              </p>
              {errors.form && (
                <p role="alert" className="text-sm text-danger">
                  {errors.form}
                  {errors.signIn && (
                    <>
                      {" "}
                      <Link href={signInHref()} className="font-semibold underline">
                        Sign in
                      </Link>
                    </>
                  )}
                </p>
              )}
              <button type="submit" disabled={submitting} className={`${buttonPrimary} w-full`}>
                {submitting ? (
                  <>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Confirming…
                  </>
                ) : (
                  `Confirm reservation · ${money(total)}`
                )}
              </button>
              <p className="text-center text-sm text-slate">By confirming, you agree to the house rules and cancellation policy.</p>
            </form>
          )}

          {step === "done" && booking && (
            <div className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-[32px] font-bold leading-10 text-ink outline-none">
                  {booking.saved ? "You’re booked." : "That was a sample stay."}
                </h2>
                <p className="mt-2 text-base text-slate">
                  {booking.saved ? (
                    <>
                      Confirmation <span className="font-semibold text-ink">{booking.confirmation}</span>. Your booking is saved to your account.
                    </>
                  ) : (
                    "Nothing was booked. Hotels you find in Stays are saved to your account when you book."
                  )}
                </p>
              </div>
              {/* From the snapshot taken on confirm, so later edits can't change it */}
              <dl className="space-y-3 border-y border-edge py-4 text-base">
                <Row label="Room" value={booking.roomName} />
                <Row label="Check-in" value={formatDate(booking.checkIn)} />
                <Row label="Check-out" value={formatDate(booking.checkOut)} />
                <Row label="Guests" value={guestLabel(booking.adults, booking.children)} />
                <Row label="Total" value={money(booking.total)} />
              </dl>
              <Link href="/" className={`${buttonPrimary} w-full`}>
                Back to home
              </Link>
              <button type="button" onClick={startOver} className={`${buttonSecondary} w-full`}>
                Book different dates
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
