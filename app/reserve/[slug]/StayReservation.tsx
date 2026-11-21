"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { PAGE_ROUTES } from "@/constants/routes";
import { findOverlap, money, overlapMessage, type OtherStay } from "@/lib/bookings";
import { blockedOffsets as calendarBlockedOffsets, BLOCKED_NOTE, freeUnitId, markBookedRooms, mergeBookedNights, roomProblem } from "@/lib/room-availability";
import { matchingRoom, roomFits } from "@/lib/stay-filters";
import { cardBrandLabel, cardErrors, typedCardBrand, type CardBrandLabel } from "@/lib/card";
import { PRICE_CHANGED_ERROR, discountPoints, findDiscount, formatPoints, pointsToDollars } from "@/lib/rewards";
import { cardExpired } from "@/utils/payment-logic";
import { MAX_NIGHTS } from "@/utils/reservation-logic";
import { addDays, formatDate, formatShort, nightsBetween, todayISO } from "../../_components/dates";
import { isMotionReduced } from "../../_components/motion";
import { buttonPrimary, buttonSecondary, Card, Field, Stars, Tag } from "../../_components/ui";
import { HotelPhoto } from "../../MyBookings/_components/HotelPhoto";
import { TAX_RATE, type Room, type Stay } from "../../_data/stays";
import { checkoutRequest } from "./checkoutRequest";
import { DateRangePicker } from "./DateRangePicker";
import { GuestsField, guestLabel } from "./GuestsField";
import { SaveHotelButton } from "../../_components/SaveHotelButton";
import { PhotoGallery } from "./PhotoGallery";
import { RewardsSection, RewardsUnavailable } from "./RewardsSection";
import { RoomOptions } from "./RoomOptions";
import { StayOffers } from "./StayOffers";
import { useBookedNightsLookup } from "./useBookedNightsLookup";

type Step = "stay" | "details" | "done";
type Errors = Partial<Record<string, string>>;
type Popover = "dates" | "guests" | null;
type Contact = { firstName: string; lastName: string; email: string; phone: string };

type SavedCard = {
  id: string;
  brand: CardBrandLabel;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

type Booking = {
  confirmation: string;
  email: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  total: number;
  saved: boolean;
};

export type StayChoices = { checkIn?: string; checkOut?: string; adults?: number; children?: number; roomId?: string };
type StayProblem = { field: "dates" | "guests"; message: string };

const noSubscribe = () => () => {};
const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone"] as const;

// Formats card number according to brand
const formatCard = (v: string) => {
  const digits = v.replace(/\D/g, "");
  const brand = typedCardBrand(digits);
  const maxDigits = brand === "Amex" ? 15 : 16;
  const truncated = digits.slice(0, maxDigits);

  if (brand === "Amex") {
    return truncated.replace(/^(\d{4})(\d{0,6})(\d{0,5})$/, (_, p1, p2, p3) =>
        [p1, p2, p3].filter(Boolean).join(" ")
    );
  }
  return truncated.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function Line({ label, value }: { label: string; value: string }) {
  return (
      <div className="flex justify-between text-slate">
        <dt>{label}</dt>
        <dd className="font-semibold text-ink">{value}</dd>
      </div>
  );
}

export function StayReservation({
                                  stay,
                                  account,
                                  otherStays = [],
                                  initial = {},
                                  search = "",
                                  pointsBalance = null,
                                }: {
  stay: Stay;
  account: { email: string } | null;
  /** null: couldn't be read */
  pointsBalance?: number | null;
  otherStays?: OtherStay[];
  initial?: StayChoices;
  search?: string;
}) {
  const router = useRouter();

  const [checkIn, setCheckIn] = useState(initial.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? "");
  const [adults, setAdults] = useState(initial.adults ?? 2);
  const [children, setChildren] = useState(initial.children ?? 0);
  const [roomId, setRoomId] = useState(
      () =>
          initial.roomId ??
          (stay.rooms.find((r) => !r.soldOut && r.sleeps >= 2) ?? stay.rooms.find((r) => !r.soldOut) ?? stay.rooms[0]).id
  );
  const [popover, setPopover] = useState<Popover>(null);
  const [step, setStep] = useState<Step>("stay");
  const [moved, setMoved] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rewardId, setRewardId] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact>({ firstName: "", lastName: "", email: "", phone: "" });

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  // null until the guest picks: the default card is used, even when the list arrives late
  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);

  const [livePrices, setLivePrices] = useState<{ key: string; byId: Record<string, Partial<Room>> } | null>(null);
  // Every room the prices route listed, including ones saved after the page loaded because LiteAPI offered them for
  // other guests; kept so a picked one stays listed
  const [addedRooms, setAddedRooms] = useState<Room[]>([]);
  // Without a LiteAPI key the stored prices on the page hold for every date. A LiteAPI outage doesn't turn
  // this off: checkout also falls back to the stored price while LiteAPI is down.
  const [pricingOff, setPricingOff] = useState(!stay.liteapiConfigured);
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmTimer = useRef<number | undefined>(undefined);
  const saveRequest = useRef<AbortController | null>(null);
  const lastStep = useRef(step);
  const bodyRef = useRef<HTMLDivElement>(null);
  const changeDatesRef = useRef<HTMLButtonElement>(null);
  const fromBox = useRef<{ height: number; top: number } | null>(null);

  const roomsLocked = step !== "stay";
  const nights = nightsBetween(checkIn, checkOut);
  // The server already priced the dates and guests in the link, so those need no fetch. Adults and children
  // apart: LiteAPI prices children by age.
  const initialKey = `${initial.checkIn ?? ""}|${initial.checkOut ?? ""}|${initial.adults ?? 2}|${initial.children ?? 0}`;
  const priceKey = stay.liteapiId && !pricingOff && nights > 0 && nights <= MAX_NIGHTS ? `${checkIn}|${checkOut}|${adults}|${children}` : null;
  const liveKey = livePrices?.key;
  const listed = [...stay.rooms, ...addedRooms.filter((r) => !stay.rooms.some((s) => s.id === r.id))];
  const priced = livePrices && livePrices.key === priceKey ? listed.map((r) => ({ ...r, ...livePrices.byId[r.id] })) : listed;
  const pricesPending = !!priceKey && priceKey !== initialKey && liveKey !== priceKey;

  // Dates after the page's ~400-day lookup are looked up for their exact nights
  const { rows: extraNights, lookingUp } = useBookedNightsLookup(stay.slug, stay.bookedWindow, checkIn, checkOut, !!stay.bookable);
  // A room card is booked for these dates when every one of its identical rooms is (audit F9)
  const rooms = markBookedRooms(mergeBookedNights(priced, extraNights), checkIn, checkOut);
  // While choosing, a room that's booked for the dates isn't kept selected: the cheapest open room
  // that fits the party takes its place (audit R5). The guest's own pick comes back if the dates
  // change back. Once past "Reserve", the room stays put and the checks below catch any problem.
  const chosen = rooms.find((r) => r.id === roomId)!;
  const guests = adults + children;
  const room =
    chosen.soldOut && step === "stay"
      ? (matchingRoom(rooms, stay.tags, { guests, adults, children, tags: [] }) ?? chosen)
      : chosen;
  const subtotal = room.nightly * nights;
  const cleaning = nights ? stay.cleaningFee : 0;
  const taxes = Math.round((subtotal + cleaning) * (stay.taxRate ?? TAX_RATE));
  const total = subtotal + cleaning + taxes;
  // Rewards need a saved booking (signed in, real hotel), where the total is exactly what /api/checkout charges.
  // A discount is a percent of that total; one whose points no longer fit the balance is dropped.
  const showRewards = Boolean(account) && stay.bookable;
  const chosenReward = showRewards ? findDiscount(rewardId) : null;
  // Cents, as the server rounds the total it prices the reward from
  const rewardPoints = chosenReward ? discountPoints(chosenReward.percent, Math.round(total * 100) / 100) : 0;
  const reward =
    chosenReward && pointsBalance !== null && rewardPoints > 0 && rewardPoints <= pointsBalance
      ? { ...chosenReward, points: rewardPoints, dollars: pointsToDollars(rewardPoints) }
      : null;
  // In cents, so a free stay comes to exactly $0
  const amountDue = Math.max(0, Math.round((total - (reward?.dollars ?? 0)) * 100) / 100);
  const pointsCoverStay = reward !== null && amountDue === 0;
  // Not part of the total: the guest pays these to the hotel
  const dueAtProperty = nights ? (room.dueAtProperty ?? 0) : 0;
  // Today is "" while rendering on the server, so the server and the browser agree on first render
  const today = useSyncExternalStore(noSubscribe, todayISO, () => "");
  // Nights the calendar crosses out, as days from today: no room that fits the party is free, or the
  // guest is at another hotel. Derived from `today` (empty on the server), so it fills in once in the browser.
  const blockedOffsets = [
    ...new Set([...stay.blockedNights, ...calendarBlockedOffsets(rooms, { adults, children }, otherStays, today, { moreRoomsMayAppear: !!stay.liteapiId })]),
  ];

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
        const full = (body.rooms ?? []).filter((r): r is Room => Number.isFinite(r.nightly) && typeof r.sleeps === "number");
        setAddedRooms((had) => {
          const fresh = full.filter((r) => !had.some((h) => h.id === r.id));
          return fresh.length ? [...had, ...fresh] : had;
        });
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


  const detectedBrand = typedCardBrand(cardNumber);

  // Saved cards only matter where a booking is saved: signed in, on a real hotel
  const canUseSavedCards = Boolean(account) && stay.bookable;
  useEffect(() => {
    if (!canUseSavedCards) return;
    const request = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/saved-payment", { signal: request.signal });
        if (!response.ok) throw new Error(`Saved cards request failed (${response.status})`);
        const result = (await response.json()) as {
          paymentMethods?: { id: string; brand: string; last4: string; exp_month: number; exp_year: number; is_default?: boolean }[];
        };
        setSavedCards(
          (result.paymentMethods ?? []).map((pm) => ({
            id: pm.id,
            brand: cardBrandLabel(pm.brand),
            last4: pm.last4,
            expMonth: Number(pm.exp_month),
            expYear: Number(pm.exp_year),
            isDefault: Boolean(pm.is_default),
          })),
        );
      } catch {
        // The new-card form still works without them
      }
    })();
    return () => request.abort();
  }, [canUseSavedCards]);

  const isExpired = (card: SavedCard) => Boolean(today) && cardExpired(card.expMonth, card.expYear, today);
  const usableCards = savedCards.filter((card) => !isExpired(card));
  const defaultCardId = (usableCards.find((card) => card.isDefault) ?? usableCards[0])?.id ?? "new";
  const pickedIsUsable = pickedCardId === "new" || usableCards.some((card) => card.id === pickedCardId);
  const selectedCardId = pickedCardId !== null && pickedIsUsable ? pickedCardId : defaultCardId;

  const setDatesOpen = useCallback((open: boolean) => setPopover((p) => (open ? "dates" : p === "dates" ? null : p)), []);
  const setGuestsOpen = useCallback((open: boolean) => setPopover((p) => (open ? "guests" : p === "guests" ? null : p)), []);

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

  function stayProblem(): StayProblem | null {
    if (!nights) return { field: "dates", message: "" };
    if (nights > MAX_NIGHTS) return { field: "dates", message: `Stays can be up to ${MAX_NIGHTS} nights.` };
    const clash = stay.bookable ? findOverlap(otherStays, checkIn, checkOut) : null;
    if (clash) return { field: "dates", message: overlapMessage(clash) };
    const booked = blockedOffsets.map((offset) => addDays(todayISO(), offset));
    if (booked.some((night) => night >= checkIn && night < checkOut)) return { field: "dates", message: "Some of those nights are already booked." };
    if (lookingUp) return { field: "dates", message: "Still checking which rooms are free on those dates. Try again in a moment." };
    // The booking API judges "today" in the guest's time zone (sent with the booking), so this uses the local date
    if (stay.bookable && checkIn < todayISO()) return { field: "dates", message: "That check-in date is too soon to book. Pick a later date." };
    if (guests > room.sleeps) return { field: "guests", message: `${room.name} sleeps up to ${room.sleeps}. Pick a bigger room or fewer guests.` };
    if (!roomFits(room, guests, adults, children)) return { field: "guests", message: `${room.name} is too small for ${guestLabel(adults, children)}. Pick another room.` };
    const taken = roomProblem(room);
    return taken ? { field: "guests", message: taken } : null;
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

  function openDatesHere(scroll: boolean) {
    flushSync(() => {
      setEditingDates(true);
      setPopover("dates");
    });
    const field = document.getElementById("checkIn");
    field?.focus({ preventScroll: true });
    if (scroll) field?.scrollIntoView({ block: "center", behavior: isMotionReduced() ? "auto" : "smooth" });
  }

  function showDatesHere(message: string) {
    setErrors(message ? { dates: message } : {});
    openDatesHere(true);
  }

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
    // Keep the room shown as selected (it may have stood in for a booked pick) for the next steps
    setRoomId(room.id);
    goTo("details");
  }

  function saveContact() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setContact(Object.fromEntries(CONTACT_FIELDS.map((k) => [k, String(data.get(k) ?? "")])) as Contact);
  }

  function backToStay() {
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

    // Validate only if a new card is selected
    if (selectedCardId === "new") {
      Object.assign(
        next,
        cardErrors(text("cardNumber"), text("expiry"), text("cvc"))
      );

      if (!text("cardName")) {
        next.cardName = "Enter the name on your card.";
      }

      if (!text("postalCode") || !/^\d{5}$/.test(text("postalCode"))) {
        next.postalCode = "Enter a valid 5-digit billing postal code.";
      }
    }

    setErrors(next);
    const firstError = Object.keys(next)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    const problem = stayProblem();
    if (problem?.field === "dates") return showDatesHere(problem.message);
    if (problem) {
      saveContact();
      return showStayProblem(problem);
    }

    saveContact();
    const snapshot = { email: text("email"), roomName: room.name, checkIn, checkOut, adults, children, total: amountDue };
    setSubmitting(true);

    const selectedCard = savedCards.find(
      (card) => card.id === selectedCardId
    );

    // Use whichever identical room is free for these dates.
    const roomToBook = freeUnitId(room, checkIn, checkOut) ?? room.id;
    const payload = selectedCard
      ? checkoutRequest({
          roomId: roomToBook,
          checkIn,
          checkOut,
          adults, 
          children,
          savedPaymentMethodId: selectedCard.id,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          rewardId: reward?.id,
          expectedTotal: total,
        })
      : checkoutRequest({
          roomId: roomToBook,
          checkIn,
          checkOut,
          adults, 
          children,
          cardNumber: text("cardNumber"),
          expiry: text("expiry"),
          cvc: text("cvc"),
          cardName: text("cardName"),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          rewardId: reward?.id,
          expectedTotal: total,
        });

    saveRequest.current?.abort();
    const request = new AbortController();
    saveRequest.current = request;
    void saveBooking(snapshot, payload, reward?.points ?? 0, request.signal, !selectedCard && saveCardForFuture);
  }

  async function saveBooking(
      snapshot: Omit<Booking, "confirmation" | "saved">,
      payload: ReturnType<typeof checkoutRequest>,
      shownPoints: number,
      signal: AbortSignal,
      saveCard: boolean,
  ) {
    const fail = (message: string, signIn = false) => {
      setSubmitting(false);
      setErrors(signIn ? { form: message, signIn: "yes" } : { form: message });
    };

    try {
      if (!stay.bookable) {
        window.clearTimeout(confirmTimer.current);
        confirmTimer.current = window.setTimeout(() => {
          setBooking({ ...snapshot, saved: false, confirmation: `LH-${Math.random().toString(36).slice(2, 8).toUpperCase()}` });
          setSubmitting(false);
          goTo("done");
        }, 900);
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string; reservation?: { id?: string; total_price?: number | string } };
      if (res.status === 401) return fail("Your sign-in has ended. Sign in again to finish booking.", true);
      if (res.status === 402) {
        const message = `${body.error ?? "Your card was declined."} Try another card.`;
        // A saved card has no card number field to show it under
        if ("saved_payment_method_id" in payload.payment) return fail(message);
        setSubmitting(false);
        setErrors({ cardNumber: message });
        document.getElementById("cardNumber")?.focus();
        return;
      }
      if (res.status === 409 && body.error === PRICE_CHANGED_ERROR) {
        // Reload the server price so the reward is re-priced before they try again
        router.refresh();
        return fail(body.error);
      }
      if (res.status === 409) {
        setSubmitting(false);
        return showDatesHere(`${body.error ?? "Those dates were just booked."} Pick other dates.`);
      }
      if (!res.ok || !body.reservation) return fail(body.error ?? "We couldn’t save your booking. Try again.");

      if (saveCard) {
        // The booking is already made, so a card that can't be saved doesn't stop it
        await fetch("/api/saved-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload.payment, time_zone: payload.time_zone }),
          signal,
        }).catch(() => undefined);
      }

      const { id, total_price } = body.reservation;
      router.refresh();
      if (id) {
        // The points shown here, so the confirmation can say if the server spent fewer
        router.push(`${PAGE_ROUTES.MY_BOOKINGS}/${id}/confirmed${shownPoints ? `?points=${shownPoints}` : ""}`);
        return;
      }

      const savedTotal = Number(total_price);
      setBooking({
        ...snapshot,
        saved: true,
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

  if (step === "details") {
    const stayDates = nights > 0 ? `${formatShort(checkIn)} – ${formatShort(checkOut)}` : "";
    return (
        <form ref={formRef} noValidate onSubmit={handleSubmit} className={moved ? "step-in" : ""}>
          <button
              type="button"
              onClick={backToStay}
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

              {showRewards && pointsBalance === null && <RewardsUnavailable step={2} />}
              {showRewards && pointsBalance !== null && (
                <RewardsSection
                  step={2}
                  hotelName={stay.name}
                  balance={pointsBalance}
                  total={total}
                  appliedId={reward?.id ?? null}
                  onApply={setRewardId}
                  onRemove={() => setRewardId(null)}
                />
              )}

              <Card as="section">
                <div className="flex items-center justify-between">
                  <h2 className="text-[32px] font-bold leading-10 text-ink">{showRewards ? 3 : 2}. Payment details</h2>
                  {selectedCardId === "new" && (
                      <span className="text-xs font-bold text-blue-dark">{detectedBrand}</span>
                  )}
                </div>
                {/* checkout_reservation checks the card even when points pay for everything */}
                {pointsCoverStay && (
                    <p role="status" className="mt-2 text-sm text-slate">
                      Your points cover this stay, so your card won’t be charged. We still need a card on file.
                    </p>
                )}

                {savedCards.length > 0 && (
                    <fieldset className="mt-5">
                      <legend className="mb-2 text-base font-semibold leading-5 text-ink">Pay with</legend>
                      <div className="flex flex-col gap-3">
                        {[...savedCards.map((card) => ({ card, id: card.id })), { card: null, id: "new" }].map(({ card, id }) => {
                          const expired = card ? isExpired(card) : false;
                          const on = !expired && selectedCardId === id;
                          return (
                              <label
                                  key={id}
                                  // Same states as the room options: default, selected, disabled
                                  className={`flex items-center gap-4 rounded-control border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue ${
                                      expired
                                          ? "cursor-not-allowed border-disabled bg-disabled"
                                          : on
                                              ? "cursor-pointer border-blue bg-surface ring-1 ring-blue"
                                              : "cursor-pointer border-edge bg-surface hover:border-blue"
                                  }`}
                              >
                                <input
                                    type="radio"
                                    name="paymentChoice"
                                    value={id}
                                    checked={on}
                                    disabled={expired}
                                    onChange={() => setPickedCardId(id)}
                                    className="h-4 w-4 shrink-0 accent-blue"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-base font-semibold leading-5 ${expired ? "text-slate" : "text-ink"}`}>
                                    {card ? `${card.brand} ending in ${card.last4}` : "Use a new card"}
                                  </p>
                                  {card && (
                                      <p className="mt-1 text-sm text-slate">
                                        {expired ? "Expired" : "Expires"} {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                                      </p>
                                  )}
                                </div>
                                {card?.isDefault && !expired && <Tag>Default</Tag>}
                                {expired && <Tag>Expired</Tag>}
                              </label>
                          );
                        })}
                      </div>
                    </fieldset>
                )}

                {/* New Card Fields */}
                {selectedCardId === "new" && (
                    // Typing a new card is a choice too, so a saved list that loads late doesn't replace it
                    <div className="mt-5 grid gap-4 sm:grid-cols-2" onInput={() => setPickedCardId((picked) => picked ?? "new")}>
                      <Field
                          id="cardNumber"
                          name="cardNumber"
                          label="Card number"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          error={errors.cardNumber}
                          onChange={(e) => {
                            const formatted = formatCard(e.target.value);
                            setCardNumber(formatted);
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
                          placeholder={detectedBrand === "Amex" ? "CVC (4 digits)" : "CVC"}
                          maxLength={4}
                          error={errors.cvc}
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/\D/g, "");
                            clear("cvc");
                          }}
                      />
                      <Field id="cardName" name="cardName" label="Name on card" autoComplete="cc-name" error={errors.cardName} onChange={() => clear("cardName")} />
                      <Field id="postalCode" name="postalCode" label="Billing postal code" autoComplete="postal-code" maxLength={5} error={errors.postalCode} onChange={() => clear("postalCode")} />

                      {canUseSavedCards && (
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink sm:col-span-2">
                            <input
                                type="checkbox"
                                checked={saveCardForFuture}
                                onChange={(e) => setSaveCardForFuture(e.target.checked)}
                                className="h-4 w-4 shrink-0 accent-blue"
                            />
                            Save this card for next time
                          </label>
                      )}
                    </div>
                )}
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
                        blockedNote={BLOCKED_NOTE}
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
                    {reward && <Line label={`${reward.category} reward`} value={`−${money(reward.dollars)}`} />}
                    <div className="flex justify-between border-t border-edge pt-3 text-lg font-bold text-ink">
                      <dt>Total</dt>
                      <dd>{money(amountDue)}</dd>
                    </div>
                  </dl>
              ) : (
                  <p className="mt-5 border-t border-edge pt-5 text-sm text-slate">Add your dates to see the total for your stay.</p>
              )}
            {reward && nights > 0 && (
              <p className="mt-2 text-sm text-slate">
                You saved {money(reward.dollars)} with {formatPoints(reward.points)}
              </p>
            )}
            {dueAtProperty > 0 && <p className="mt-2 text-sm text-slate">{dueAtPropertyText(dueAtProperty)}</p>}

            {checkIn && (
              <Card tone="tint" padding="none" className="mt-5 p-4 text-sm">
                {/* The rule cancel_reservation applies (audit F4): only insured bookings are refunded */}
                <p className="font-semibold text-ink">Non-refundable</p>
                <p className="mt-1 text-slate">You can cancel any time before check-in, but without cancellation insurance there’s no refund.</p>
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

              <button type="submit" disabled={submitting} className={`${buttonPrimary} mt-5 w-full`}>
                {submitting ? (
                    <>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Confirming…
                    </>
                ) : pointsCoverStay ? (
                    "Confirm and book"
                ) : nights > 0 ? (
                    `Confirm and pay ${money(amountDue)}`
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
        <Link href={search ? `/search?${search}` : "/search"} className="group inline-flex items-center gap-1 text-base font-semibold text-ink">
          <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">←</span> Back to stays
        </Link>

        <div className="mt-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 break-words text-balance font-serif text-[40px] leading-[48px] text-ink sm:text-[56px] sm:leading-[64px]">{stay.name}</h1>
            {/* Database hotels only: a saved hotel is stored by hotels.id, which sample stays don't have */}
            {stay.bookable && <SaveHotelButton hotelId={stay.slug} hotelName={stay.name} className="mt-2 shrink-0 sm:mt-4" />}
          </div>
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
            selectedId={room.id}
            onSelect={(id) => {
              setRoomId(id);
              clear("guests");
            }}
            locked={roomsLocked}
            note={() => "Non-refundable"}
            party={{ adults, children }}
          />
        </fieldset>

          <aside
              ref={cardRef}
              aria-label="Reserve"
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
                blockedNote={BLOCKED_NOTE}
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

const dueAtPropertyText = (amount: number) => `Plus ${money(amount)} in hotel fees, paid at the property.`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
