"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { PAGE_ROUTES } from "@/constants/routes";
import { findOverlap, money, overlapMessage, type OtherStay } from "@/lib/bookings";
import { cardErrors } from "@/lib/card";
import { MAX_NIGHTS } from "@/utils/reservation-logic";
import { addDays, formatDate, formatShort, nightsBetween, todayISO } from "../../_components/dates";
import { isMotionReduced } from "../../_components/motion";
import { buttonPrimary, buttonSecondary, Card, Field, Stars } from "../../_components/ui";
import { HotelPhoto } from "../../MyBookings/_components/HotelPhoto";
import { TAX_RATE, type Room, type Stay } from "../../_data/stays";
import { checkoutRequest } from "./checkoutRequest";
import { DateRangePicker } from "./DateRangePicker";
import { GuestsField, guestLabel } from "./GuestsField";
import { PhotoGallery } from "./PhotoGallery";
import { RoomOptions } from "./RoomOptions";
import { StayOffers } from "./StayOffers";

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
  otherStays = [],
  initial = {},
  search = "",
}: {
  stay: Stay;
  /** The signed-in guest, or null when signed out (booking needs an account) */
  account: { email: string } | null;
  /** The guest's bookings at other hotels, which a new stay can't overlap */
  otherStays?: OtherStay[];
  initial?: StayChoices;
  /** The search this stay was opened from (its query string), for Back to stays */
  search?: string;
}) {
  const router = useRouter();
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
  // Steps only animate in once the guest has moved between them, never on page load
  const [moved, setMoved] = useState(false);
  // Changing dates from the payment step, so typed card details aren't lost going back
  const [editingDates, setEditingDates] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  // Contact details survive going back to the stay (card details aren't kept)
  const [contact, setContact] = useState<Contact>({ firstName: "", lastName: "", email: "", phone: "" });
  const [livePrices, setLivePrices] = useState<{ key: string; byId: Record<string, Partial<Room>> } | null>(null);
  // Without a LiteAPI key the stored prices on the page hold for every date. A LiteAPI outage doesn't turn
  // this off: the refetch caches "unavailable", so checkout charges the same stored price the guest sees.
  const [pricingOff, setPricingOff] = useState(!stay.liteapiConfigured);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmTimer = useRef<number | undefined>(undefined);
  const saveRequest = useRef<AbortController | null>(null);
  const lastStep = useRef(step);
  const bodyRef = useRef<HTMLDivElement>(null);
  const changeDatesRef = useRef<HTMLButtonElement>(null);
  // The card's height and screen position just before a step change, for the transition
  const fromBox = useRef<{ height: number; top: number } | null>(null);
  // After Reserve, the room list is locked until the guest goes back to their stay
  const roomsLocked = step !== "stay";

  const nights = nightsBetween(checkIn, checkOut);
  const guests = adults + children;
  // The server already priced the dates and guests in the link, so those need no fetch. Adults and children
  // apart: LiteAPI prices children by age.
  const initialKey = `${initial.checkIn ?? ""}|${initial.checkOut ?? ""}|${initial.adults ?? 2}|${initial.children ?? 0}`;
  const priceKey = stay.liteapiId && !pricingOff && nights > 0 && nights <= MAX_NIGHTS ? `${checkIn}|${checkOut}|${adults}|${children}` : null;
  const liveKey = livePrices?.key;
  const rooms = livePrices && livePrices.key === priceKey ? stay.rooms.map((r) => ({ ...r, ...livePrices.byId[r.id] })) : stay.rooms;
  const pricesPending = !!priceKey && priceKey !== initialKey && liveKey !== priceKey;

  const room = rooms.find((r) => r.id === roomId)!;
  const subtotal = room.nightly * nights;
  const cleaning = nights ? stay.cleaningFee : 0;
  const taxes = Math.round((subtotal + cleaning) * (stay.taxRate ?? TAX_RATE));
  const total = subtotal + cleaning + taxes;
  // Not part of the total: the guest pays these to the hotel
  const dueAtProperty = nights ? (room.dueAtProperty ?? 0) : 0;
  // Today is "" while rendering on the server, so the server and the browser agree on first render
  const today = useSyncExternalStore(noSubscribe, todayISO, () => "");
  const [userBookingBlockedOffsets, setUserBookingBlockedOffsets] = useState<number[]>([]);

  useEffect(() => {
    const currentDate = todayISO();

    const offsets = otherStays.flatMap((booking) => {
      const bookingOffsets: number[] = [];

      for (
        let night = booking.checkIn;
        night < booking.checkOut;
        night = addDays(night, 1)
      ) {
        if (night >= currentDate) {
          bookingOffsets.push(nightsBetween(currentDate, night));
        }
      }

      return bookingOffsets;
    });

    setUserBookingBlockedOffsets(offsets);
  }, [otherStays]);

  useEffect(() => {
    if (!priceKey || priceKey === initialKey || priceKey === liveKey) return;
    const [ci, co, a, c] = priceKey.split("|");
    const request = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ checkIn: ci, checkOut: co, adults: a, children: c });
        const res = await fetch(`/api/stays/${stay.slug}/prices?${query}`, { signal: request.signal });
        if (!res.ok) throw new Error(`Prices request failed (${res.status})`);
        const body = (await res.json()) as { configured?: boolean; rooms?: (Partial<Room> & { id: string })[] };
        if (request.signal.aborted) return;
        // The route sets every key (null without a live quote), so an earlier quote's terms and fees don't linger
        const byId: Record<string, Partial<Room>> = {};
        for (const { id, ...r } of body.rooms ?? []) if (Number.isFinite(r.nightly)) byId[id] = { ...r, soldOut: !!r.soldOut };
        setLivePrices({ key: priceKey, byId });
        if (body.configured === false) setPricingOff(true);
      } catch {
        // Keeps the prices already shown; checkout prices the stay on the server either way
        if (!request.signal.aborted) setLivePrices({ key: priceKey, byId: {} });
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [priceKey, initialKey, liveKey, stay.slug]);

  const blockedOffsets = [
    ...new Set([...stay.blockedNights, ...userBookingBlockedOffsets]),
  ];

  const terms = cancelTerms(stay, room, checkIn, today);

  const setDatesOpen = useCallback((open: boolean) => setPopover((p) => (open ? "dates" : p === "dates" ? null : p)), []);
  const setGuestsOpen = useCallback((open: boolean) => setPopover((p) => (open ? "guests" : p === "guests" ? null : p)), []);

  // A step change resizes the card smoothly (the new step fades in through .step-in), keeps the
  // card where it was on screen, and moves focus to the step's heading. The checkout replaces the
  // whole page, so it starts at the top instead.
  useLayoutEffect(() => {
    if (lastStep.current === step) return;
    const prev = lastStep.current;
    lastStep.current = step;
    const card = cardRef.current;
    const body = bodyRef.current;
    const from = fromBox.current;
    fromBox.current = null;
    const reduced = isMotionReduced();
    if (card && from) {
      // On wide screens the stay step's card is pinned while scrolling and the others aren't, so
      // leaving it would make the card jump up the page: scroll by the jump to keep it in place
      const jump = prev === "stay" ? card.getBoundingClientRect().top - from.top : 0;
      if (jump) window.scrollBy({ top: jump, behavior: "instant" });
      if (body && !reduced && body.offsetHeight !== from.height) {
        body.animate([{ height: `${from.height}px`, overflow: "hidden" }, { height: `${body.offsetHeight}px`, overflow: "hidden" }], {
          duration: 700,
          easing: "cubic-bezier(0.33, 1, 0.68, 1)",
        });
      }
    }
    if (step === "details") window.scrollTo({ top: 0, behavior: "instant" });
    const top = card?.getBoundingClientRect().top ?? 0;
    if (card && (top < 0 || top > window.innerHeight - 160)) card.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
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
    const booked = blockedOffsets.map((offset) => addDays(todayISO(), offset));
    if (booked.some((night) => night >= checkIn && night < checkOut)) return { field: "dates", message: "Some of those nights are already booked." };
    // The booking API judges "today" in the guest's time zone (sent with the booking), so this uses the local date
    if (stay.bookable && checkIn < todayISO()) return { field: "dates", message: "That check-in date is too soon to book. Pick a later date." };
    const clash = stay.bookable ? findOverlap(otherStays, checkIn, checkOut) : null;
    if (clash) return { field: "dates", message: overlapMessage(clash) };
    if (room.soldOut) return { field: "guests", message: `${room.name} is sold out. Pick another room.` };
    if (guests > room.sleeps) return { field: "guests", message: `${room.name} sleeps up to ${room.sleeps}. Pick a bigger room or fewer guests.` };
    return null;
  }

  function goTo(next: Step) {
    if (next === step) return;
    const card = cardRef.current;
    const body = bodyRef.current;
    if (card && body) fromBox.current = { height: body.offsetHeight, top: card.getBoundingClientRect().top };
    setMoved(true);
    setEditingDates(false);
    setStep(next);
  }

  // Opens the calendar on the payment step and moves focus into it. flushSync renders it first: after
  // an await (a 409 from checkout) React would otherwise render it only after this returns.
  function openDatesHere(scroll: boolean) {
    flushSync(() => {
      setEditingDates(true);
      setPopover("dates");
    });
    const field = document.getElementById("checkIn");
    field?.focus({ preventScroll: true });
    // It sits near the top of a long form, far above the Confirm button
    if (scroll) field?.scrollIntoView({ block: "center", behavior: isMotionReduced() ? "auto" : "smooth" });
  }

  // A dates problem found on the payment step: fix the dates right there instead of going back
  function showDatesHere(message: string) {
    setErrors(message ? { dates: message } : {});
    openDatesHere(true);
  }

  // Done or Escape folds the payment step's calendar back into the summary once the dates work. An
  // outside click doesn't: removing it mid-click would move the button being clicked (Confirm).
  function foldDates() {
    if (!(nights > 0 && nights <= MAX_NIGHTS)) return;
    flushSync(() => setEditingDates(false));
    changeDatesRef.current?.focus({ preventScroll: true });
  }

  function showStayProblem(problem: StayProblem) {
    goTo("stay");
    if (problem.field === "dates") {
      setErrors(problem.message ? { dates: problem.message } : {});
      setPopover("dates");
      return;
    }
    setErrors({ guests: problem.message });
    document.getElementById("guests")?.focus();
  }

  // Sign-in, then straight back to this stay with the same room, dates and guests picked. The search
  // rides along as `from`, so Back to stays still returns to it.
  function signInHref() {
    const back = new URLSearchParams({ room: room.id, adults: String(adults), children: String(children) });
    if (checkIn && checkOut) {
      back.set("checkIn", checkIn);
      back.set("checkOut", checkOut);
    }
    if (search) back.set("from", search);
    return `/auth/login?next=${encodeURIComponent(`/reserve/${stay.slug}?${back}`)}`;
  }

  function reserve() {
    if (pricesPending) return;
    const problem = stayProblem();
    if (problem) return showStayProblem(problem);
    if (!account) return router.push(signInHref());
    setErrors({});
    setPopover(null);
    goTo("details");
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
    goTo("stay");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pricesPending) return;
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const next: Errors = {};

    if (!text("firstName")) next.firstName = "Enter your first name.";
    if (!text("lastName")) next.lastName = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(text("email"))) next.email = "Enter a valid email address.";
    Object.assign(next, cardErrors(text("cardNumber"), text("expiry"), text("cvc")));
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
    if (problem?.field === "dates") return showDatesHere(problem.message);
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
        goTo("done");
      }, 900);
      return;
    }

    const payload = checkoutRequest({
      roomId: room.id,
      checkIn,
      checkOut,
      adults,
      children,
      cardNumber: text("cardNumber"),
      expiry: text("expiry"),
      cvc: text("cvc"),
      cardName: text("cardName"),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    saveRequest.current?.abort();
    const request = new AbortController();
    saveRequest.current = request;
    void saveBooking(snapshot, payload, request.signal);
  }

  // A mock charge (nothing is billed), then the booking and its payment are saved
  async function saveBooking(snapshot: Omit<Booking, "confirmation" | "saved">, payload: ReturnType<typeof checkoutRequest>, signal: AbortSignal) {
    const fail = (message: string, signIn = false) => {
      setSubmitting(false);
      setErrors(signIn ? { form: message, signIn: "yes" } : { form: message });
    };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; reservation?: { id?: string; total_price?: number | string } };
      if (res.status === 401) return fail("Your sign-in has ended. Sign in again to finish booking.", true);
      if (res.status === 402) {
        // A declined card saves nothing, so the guest can just try another one
        setSubmitting(false);
        setErrors({ cardNumber: `${body.error ?? "Your card was declined."} Try another card.` });
        document.getElementById("cardNumber")?.focus();
        return;
      }
      if (res.status === 409) {
        setSubmitting(false);
        return showDatesHere(`${body.error ?? "Those dates were just booked."} Pick other dates.`);
      }
      if (!res.ok || !body.reservation) return fail(body.error ?? "We couldn’t save your booking. Try again.");

      const { id, total_price } = body.reservation;
      // Refresh first: it clears Next's back/forward cache (so Back to My bookings shows the new
      // booking) even though the navigation right after it takes over
      router.refresh();
      if (id) {
        // The button keeps saying "Confirming…" until the confirmation page loads
        router.push(`${PAGE_ROUTES.MY_BOOKINGS}/${id}/confirmed`);
        return;
      }
      const savedTotal = Number(total_price);
      setBooking({
        ...snapshot,
        saved: true,
        // The saved total, in case the server priced it differently from the card
        total: Number.isFinite(savedTotal) && total_price !== null ? savedTotal : snapshot.total,
        confirmation: "LH-SAVED",
      });
      setSubmitting(false);
      goTo("done");
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
    goTo("stay");
  }

  // Omar's checkout design: the whole page becomes the checkout, details and payment beside the summary
  if (step === "details") {
    const stayDates = nights > 0 ? `${formatShort(checkIn)} - ${formatShort(checkOut)}` : "";
    return (
      <form ref={formRef} noValidate onSubmit={handleSubmit} className={moved ? "step-in" : ""}>
        {/* Ink, like Back to stays: blue text on the sky strip is too faint to read */}
        <button
          type="button"
          onClick={backToStay}
          // Once a real booking is sent the server saves it either way, so going back would hide it
          disabled={submitting && stay.bookable}
          className="group inline-flex items-center gap-1 text-base font-semibold text-ink disabled:cursor-not-allowed disabled:text-slate"
        >
          <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1 group-disabled:translate-x-0">
            ←
          </span>{" "}
          Back to your stay
        </button>

        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-ink">Secure checkout</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-balance break-words font-serif text-[40px] leading-[48px] text-ink outline-none sm:text-[56px] sm:leading-[64px]"
          >
            Complete your booking
          </h1>
          <p className="mt-1 text-base text-slate">
            {[`${room.name} at ${stay.name}`, stayDates, guestLabel(adults, children)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <Card as="section">
              <h2 className="text-[32px] font-bold leading-10 text-ink">1. Your details</h2>
              {account?.email && (
                <p className="mt-1 text-sm text-slate">
                  Signed in as <span className="font-semibold text-ink">{account.email}</span>
                </p>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="firstName" name="firstName" label="First name" autoComplete="given-name" defaultValue={contact.firstName} error={errors.firstName} onChange={() => clear("firstName")} />
                <Field id="lastName" name="lastName" label="Last name" autoComplete="family-name" defaultValue={contact.lastName} error={errors.lastName} onChange={() => clear("lastName")} />
                <Field id="email" name="email" label="Email address" type="email" autoComplete="email" defaultValue={contact.email || account?.email} error={errors.email} onChange={() => clear("email")} />
                <Field id="phone" name="phone" label="Phone (optional)" type="tel" autoComplete="tel" defaultValue={contact.phone} />
              </div>
            </Card>

            <Card as="section">
              <h2 className="text-[32px] font-bold leading-10 text-ink">2. Payment details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                  className="sm:col-span-2"
                />
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
                <Field id="cardName" name="cardName" label="Name on card" autoComplete="cc-name" error={errors.cardName} onChange={() => clear("cardName")} />
                <Field id="postalCode" name="postalCode" label="Billing postal code" autoComplete="postal-code" error={errors.postalCode} onChange={() => clear("postalCode")} />
              </div>
            </Card>
          </div>

          <Card as="section">
            <h2 className="text-xl font-semibold text-ink">Booking summary</h2>
            <HotelPhoto url={stay.photos?.[0] ?? null} priority className="mt-5 aspect-[16/9] w-full" />
            <h3 className="mt-5 break-words text-lg font-semibold text-ink">{stay.name}</h3>
            <p className="mt-1 text-sm text-slate">{stay.location}</p>
            <p className="mt-3 text-sm text-slate">
              {room.name}
              {nights > 0 && ` · ${nights} ${nights === 1 ? "night" : "nights"}`}
            </p>
            <p className="text-sm text-slate">{guestLabel(adults, children)} · 1 room</p>

            {editingDates ? (
              <div className="mt-4">
                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={(a, b) => {
                    setCheckIn(a);
                    setCheckOut(b);
                    clear("dates");
                  }}
                  blockedOffsets={blockedOffsets}
                  open={popover === "dates"}
                  onOpenChange={setDatesOpen}
                  onDone={foldDates}
                  error={errors.dates}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-paper p-3 text-sm">
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate">Check-in</dt>
                    <dd className="font-semibold text-ink">{checkIn ? formatShort(checkIn) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate">Check-out</dt>
                    <dd className="font-semibold text-ink">{checkOut ? formatShort(checkOut) : "—"}</dd>
                  </div>
                </dl>
                <button
                  ref={changeDatesRef}
                  type="button"
                  disabled={submitting}
                  onClick={() => openDatesHere(false)}
                  className="mt-2 font-semibold text-blue hover:text-blue-dark disabled:cursor-not-allowed disabled:text-slate"
                >
                  Change dates
                </button>
              </div>
            )}

            {nights > 0 ? (
              <dl className="mt-5 space-y-3 border-t border-edge pt-5 text-sm">
                <Line label={`${money(room.nightly)} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={money(subtotal)} />
                {stay.cleaningFee > 0 && <Line label="Cleaning fee" value={money(cleaning)} />}
                {taxes > 0 && <Line label="Taxes and fees" value={money(taxes)} />}
                <div className="flex justify-between border-t border-edge pt-3 text-lg font-bold text-ink">
                  <dt>Total</dt>
                  <dd>{money(total)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-5 border-t border-edge pt-5 text-sm text-slate">Add your dates to see the total for your stay.</p>
            )}
            {dueAtProperty > 0 && <p className="mt-2 text-sm text-slate">{dueAtPropertyText(dueAtProperty)}</p>}

            {checkIn && terms && (
              <Card tone="tint" padding="none" className="mt-5 p-4 text-sm">
                {cancelText(terms, !!stay.liteapiId).map((text, i) => (
                  <p key={i} className={i === 0 ? "font-semibold text-ink" : "mt-1 text-slate"}>
                    {text}
                  </p>
                ))}
              </Card>
            )}

            {errors.form && (
              <p role="alert" className="mt-5 text-sm text-danger">
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
            <button type="submit" disabled={submitting || pricesPending} className={`${buttonPrimary} mt-5 w-full`}>
              {pricesPending && !submitting ? (
                "Updating prices…"
              ) : submitting ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Confirming…
                </>
              ) : nights > 0 ? (
                `Confirm and pay ${money(total)}`
              ) : (
                "Confirm and pay"
              )}
            </button>
            <p className="mt-3 text-center text-sm text-slate">By confirming, you agree to the house rules and cancellation policy.</p>
          </Card>
        </div>
      </form>
    );
  }

  return (
    <>
      {/* Ink, not blue, even on hover: blue text on the sky strip is too faint to read */}
      <Link href={search ? `/search?${search}` : "/search"} className="group inline-flex items-center gap-1 text-base font-semibold text-ink">
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

      <StayOffers offers={stay.offers ?? stay.tags.map((label) => ({ label }))} goodFor={stay.goodFor ?? []} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_514px] lg:items-start">
        <fieldset id="rooms" disabled={roomsLocked} aria-describedby={roomsLocked ? "rooms-locked" : undefined} className="min-w-0 scroll-mt-6">
          <legend className="text-[32px] font-bold leading-10 text-ink">
            <h2>Choose a room</h2>
          </legend>
          {roomsLocked && (
            <p id="rooms-locked" className="mt-2 text-sm text-slate">
              {booking?.saved ? "Your room is booked." : "Sample stay, so nothing was booked."}
            </p>
          )}
          <RoomOptions
            rooms={rooms}
            selectedId={roomId}
            onSelect={(id) => {
              setRoomId(id);
              clear("guests");
            }}
            locked={roomsLocked}
            note={(r) => cancelNote(cancelTerms(stay, r, checkIn, today))}
          />
        </fieldset>

        <aside
          ref={cardRef}
          aria-label="Reserve"
          // Form card from the sheet: white surface, pale blue edge, 50px horizontal inset.
          className={`scroll-mt-6 rounded-2xl border border-edge bg-surface p-5 sm:p-6 lg:p-7 ${step === "stay" ? "lg:sticky lg:top-6" : ""}`}
        >
          <div ref={bodyRef}>
          {step === "stay" && (
            <div className={`space-y-5 ${moved ? "step-in" : ""}`}>
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
                blockedOffsets={blockedOffsets}
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
                <div>
                  <dl className="space-y-2 text-base">
                    <Line label={`${money(room.nightly)} × ${nights} ${nights === 1 ? "night" : "nights"}`} value={money(subtotal)} />
                    {stay.cleaningFee > 0 && <Line label="Cleaning fee" value={money(cleaning)} />}
                    {taxes > 0 && <Line label="Taxes and fees" value={money(taxes)} />}
                    <div className="flex justify-between border-t border-edge pt-3 text-base font-bold text-ink">
                      <dt>Total</dt>
                      <dd>{money(total)}</dd>
                    </div>
                  </dl>
                  {dueAtProperty > 0 && <p className="mt-2 text-sm text-slate">{dueAtPropertyText(dueAtProperty)}</p>}
                </div>
              ) : (
                <p className="text-sm text-slate">Add your dates to see the total for your stay.</p>
              )}

              {!account && (
                <div className="rounded-control border border-blue/30 bg-blue/5 p-4 text-sm text-slate">
                  <p className="text-base font-semibold leading-5 text-ink">Sign in to reserve</p>
                  <p className="mt-1">You need a LikeHome account to book. Pick your room and dates first, and we’ll bring you back here after you sign in.</p>
                </div>
              )}

              <button type="button" onClick={reserve} disabled={pricesPending} className={`${buttonPrimary} w-full`}>
                {pricesPending ? "Updating prices…" : nights === 0 ? "Check availability" : account ? "Reserve" : "Sign in to reserve"}
              </button>
              <p className="text-center text-sm text-slate">You won’t be charged yet.</p>
            </div>
          )}

          {step === "done" && booking && (
            <div className={`space-y-5 ${moved ? "step-in" : ""}`}>
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
              {booking.saved ? (
                <Link href={PAGE_ROUTES.MY_BOOKINGS} className={`${buttonPrimary} w-full`}>
                  View My Bookings
                </Link>
              ) : (
                <Link href="/" className={`${buttonPrimary} w-full`}>
                  Back to home
                </Link>
              )}
              <button type="button" onClick={startOver} className={`${buttonSecondary} w-full`}>
                Book different dates
              </button>
            </div>
          )}
          </div>
        </aside>
      </div>
    </>
  );
}

type CancelTerms = { refundable: boolean; free: boolean; /** "" when there's no date to show */ until: string };

// Owner hotels and the sample stays follow the site's own rule: free cancellation until 2 days before check-in.
// A LiteAPI room follows its rate, so it promises nothing (null) until LiteAPI has quoted it.
function cancelTerms(stay: Stay, room: Room, checkIn: string, today: string): CancelTerms | null {
  if (stay.liteapiId) {
    if (room.refundable == null) return null;
    if (!room.refundable) return { refundable: false, free: false, until: "" };
  }
  const until = stay.liteapiId ? (room.cancelBy ?? "") : checkIn ? addDays(checkIn, -2) : "";
  return { refundable: true, free: !until || !today || until > today, until };
}

function cancelNote(t: CancelTerms | null) {
  if (!t) return "";
  return !t.refundable ? "Non-refundable" : t.free ? "Free cancellation" : "No free cancellation";
}

/** The heading and the line under it, for the checkout summary */
function cancelText(t: CancelTerms, liteapi: boolean): [string, string] {
  if (!t.refundable) return ["Non-refundable", "This rate can’t be refunded if you cancel."];
  if (!t.free) {
    return liteapi
      ? ["No free cancellation", "Free cancellation for this rate has ended, so the hotel charges a fee if you cancel."]
      : ["No free cancellation", "This booking can’t be cancelled for free. The first night is non-refundable."];
  }
  if (!t.until) return ["Free cancellation", "This rate can be cancelled without a fee."];
  return [
    `Free cancellation until ${formatDate(t.until)}`,
    liteapi ? "After that, the hotel charges a cancellation fee." : "After that, the first night is non-refundable.",
  ];
}

const dueAtPropertyText = (amount: number) => `Plus ${money(amount)} in hotel fees, paid at the property.`;

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
