"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DAY, formatDate, formatShort, fromUTC, nightsBetween, toUTC } from "../../_components/dates";
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

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// One page: photos, fact tags, rooms, and a booking card that walks through
// dates and guests → your details and payment → confirmation.
export function StayReservation({ stay }: { stay: Stay }) {
  const facts = getFacts(stay);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomId, setRoomId] = useState(() => (stay.rooms.find((r) => !r.soldOut) ?? stay.rooms[0]).id);
  const [popover, setPopover] = useState<Popover>(null);
  const [step, setStep] = useState<Step>("stay");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStep = useRef(step);

  const room = stay.rooms.find((r) => r.id === roomId)!;
  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = room.nightly * nights;
  const cleaning = nights ? stay.cleaningFee : 0;
  const taxes = Math.round((subtotal + cleaning) * TAX_RATE);
  const total = subtotal + cleaning + taxes;
  const guests = adults + children;

  const setDatesOpen = useCallback((open: boolean) => setPopover((p) => (open ? "dates" : p === "dates" ? null : p)), []);
  const setGuestsOpen = useCallback((open: boolean) => setPopover((p) => (open ? "guests" : p === "guests" ? null : p)), []);

  // When the card changes step, bring it into view and move focus to its heading.
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: isMotionReduced() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const clear = (name: string) =>
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });

  function reserve() {
    if (!nights) {
      setPopover("dates");
      return;
    }
    if (guests > room.sleeps) {
      setErrors({ guests: `${room.name} sleeps up to ${room.sleeps}. Pick a bigger room or fewer guests.` });
      document.getElementById("guests")?.focus();
      return;
    }
    setErrors({});
    setPopover(null);
    setStep("details");
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

    setGuestEmail(text("email"));
    setSubmitting(true);
    // TODO: send the reservation to the backend once it exists. Simulated for now.
    setTimeout(() => {
      setConfirmation(`LH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
      setSubmitting(false);
      setStep("done");
    }, 900);
  }

  function startOver() {
    setCheckIn("");
    setCheckOut("");
    setErrors({});
    setStep("stay");
  }

  return (
    <>
      <Link href="/#stays" className="inline-flex items-center gap-1 text-base font-semibold text-blue hover:text-blue-dark">
        <span aria-hidden>←</span> Back to stays
      </Link>

      <div className="mt-4">
        <h1 className="font-serif text-[56px] leading-[64px] text-ink">{stay.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate">
          <span>{stay.location}</span>
          <span aria-hidden>·</span>
          <Stars rating={stay.rating} reviews={stay.reviews} />
        </p>
      </div>

      <PhotoGallery stayName={stay.name} />

      <FactTags groups={facts} stayName={stay.name} location={stay.location} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_514px] lg:items-start">
        <fieldset id="rooms" className="min-w-0 scroll-mt-6">
          <legend className="text-[32px] font-bold leading-10 text-ink">Choose a room</legend>
          <div className="mt-5 space-y-4">
            {stay.rooms.map((r) => {
              const on = r.id === roomId;
              const off = !!r.soldOut;
              return (
                <label
                  key={r.id}
                  // Room options follow the sheet's field states: default, selected (focus look), disabled.
                  className={`flex items-center gap-4 rounded-control border p-4 transition sm:gap-6 sm:px-5 has-[:focus-visible]:border-blue has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-blue ${
                    off
                      ? "cursor-not-allowed border-disabled bg-disabled"
                      : on
                        ? "cursor-pointer border-blue bg-surface ring-1 ring-blue"
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
                      {r.description} · Sleeps {r.sleeps}
                    </p>
                    <p className="text-sm text-slate">{off ? "Sold out right now" : "Free cancellation"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-base font-semibold ${off ? "text-slate line-through" : "text-ink"}`}>{money(r.nightly)}</p>
                    <p className="text-sm text-slate">per night</p>
                  </div>
                  <span
                    aria-hidden
                    className={`hidden h-[46px] w-28 shrink-0 items-center justify-center rounded-control text-base font-semibold sm:inline-flex ${
                      off ? "border border-edge text-slate" : on ? "bg-blue text-white" : "border border-edge bg-surface text-ink"
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
                }}
                blockedOffsets={stay.blockedNights}
                open={popover === "dates"}
                onOpenChange={setDatesOpen}
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
                  <Line label="Cleaning fee" value={money(cleaning)} />
                  <Line label="Taxes and fees" value={money(taxes)} />
                  <div className="flex justify-between border-t border-edge pt-3 text-base font-bold text-ink">
                    <dt>Total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate">Add your dates to see the total for your stay.</p>
              )}

              <button type="button" onClick={reserve} className={`${buttonPrimary} w-full`}>
                {nights > 0 ? "Reserve" : "Check availability"}
              </button>
              <p className="text-center text-sm text-slate">You won’t be charged yet.</p>
            </div>
          )}

          {step === "details" && (
            <form noValidate onSubmit={handleSubmit} className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setStep("stay");
                }}
                className="inline-flex h-11 items-center gap-1.5 text-base font-semibold text-blue hover:text-blue-dark"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Back to your stay
              </button>
              <h2 ref={headingRef} tabIndex={-1} className="text-[32px] font-bold leading-10 text-ink outline-none">
                Your details
              </h2>

              <div className="rounded-control border border-edge bg-paper p-4 text-sm text-slate">
                <p className="text-base font-semibold leading-5 text-ink">{room.name}</p>
                <p className="mt-1">
                  {formatShort(checkIn)} – {formatShort(checkOut)} · {nights} {nights === 1 ? "night" : "nights"}
                </p>
                <p>{guestLabel(adults, children)}</p>
                <p className="mt-2 flex justify-between text-base font-bold text-ink">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field id="firstName" name="firstName" label="First name" placeholder="Alex" autoComplete="given-name" error={errors.firstName} onChange={() => clear("firstName")} />
                <Field id="lastName" name="lastName" label="Last name" placeholder="Rivera" autoComplete="family-name" error={errors.lastName} onChange={() => clear("lastName")} />
              </div>
              <Field id="email" name="email" label="Email address" type="email" placeholder="you@example.com" autoComplete="email" hint="We’ll send your confirmation here." error={errors.email} onChange={() => clear("email")} />
              <Field id="phone" name="phone" label="Phone (optional)" type="tel" placeholder="+1 555 010 0000" autoComplete="tel" />

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
                <Field id="cardName" name="cardName" label="Name on card" autoComplete="cc-name" placeholder="Alex Rivera" error={errors.cardName} onChange={() => clear("cardName")} />
                <Field id="postalCode" name="postalCode" label="Billing postal code" autoComplete="postal-code" placeholder="94107" error={errors.postalCode} onChange={() => clear("postalCode")} />
              </div>

              <p className="text-sm text-slate">
                Free cancellation until {formatDate(fromUTC(toUTC(checkIn) - 2 * DAY))}. After that, the first night is non-refundable.
              </p>
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

          {step === "done" && (
            <div className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-[32px] font-bold leading-10 text-ink outline-none">
                  You’re booked.
                </h2>
                <p className="mt-2 text-base text-slate">
                  Confirmation <span className="font-semibold text-ink">{confirmation}</span> is on its way to {guestEmail}.
                </p>
              </div>
              <dl className="space-y-3 border-y border-edge py-4 text-base">
                <Row label="Room" value={room.name} />
                <Row label="Check-in" value={formatDate(checkIn)} />
                <Row label="Check-out" value={formatDate(checkOut)} />
                <Row label="Guests" value={guestLabel(adults, children)} />
                <Row label="Total" value={money(total)} />
              </dl>
              <Link href="/" className={`${buttonPrimary} w-full`}>
                Back to home
              </Link>
              <button type="button" onClick={startOver} className={`${buttonSecondary} w-full`}>
                Book another stay
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
