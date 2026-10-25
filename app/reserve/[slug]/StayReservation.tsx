"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { PAGE_ROUTES } from "@/constants/routes";
import { findOverlap, money, overlapMessage, type OtherStay } from "@/lib/bookings";
import { cardErrors } from "@/lib/card";
import { MAX_NIGHTS } from "@/utils/reservation-logic";
import { createClient } from "@/utils/supabase/client";
import { addDays, formatDate, formatShort, nightsBetween, todayISO } from "../../_components/dates";
import { isMotionReduced } from "../../_components/motion";
import { buttonPrimary, buttonSecondary, Card, Field, Stars } from "../../_components/ui";
import { HotelPhoto } from "../../MyBookings/_components/HotelPhoto";
import { TAX_RATE, type Stay } from "../../_data/stays";
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

export interface PaymentMethod {
  id: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Discover" | "Card";
  last4: string;
  expMonth: string;
  expYear: string;
  isDefault?: boolean;
}

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

// Card brand auto-detection
const getCardBrand = (num: string): PaymentMethod["brand"] => {
  const clean = num.replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(clean)) return "Discover";
  return "Card";
};

// Formats card number according to brand
const formatCard = (v: string) => {
  const digits = v.replace(/\D/g, "");
  const brand = getCardBrand(digits);
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

// Luhn Algorithm Check
const validateLuhn = (num: string) => {
  const clean = num.replace(/\D/g, "");
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
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
                                }: {
  stay: Stay;
  account: { email: string } | null;
  otherStays?: OtherStay[];
  initial?: StayChoices;
  search?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

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
  const [contact, setContact] = useState<Contact>({ firstName: "", lastName: "", email: "", phone: "" });

  // Saved Payment Methods State
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | "new">("new");
  const [cardNumber, setCardNumber] = useState("");
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);

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
  const room = stay.rooms.find((r) => r.id === roomId)!;
  const nights = nightsBetween(checkIn, checkOut);
  const subtotal = room.nightly * nights;
  const cleaning = nights ? stay.cleaningFee : 0;
  const taxes = Math.round((subtotal + cleaning) * (stay.taxRate ?? TAX_RATE));
  const total = subtotal + cleaning + taxes;
  const guests = adults + children;
  const today = useSyncExternalStore(noSubscribe, todayISO, () => "");
  const cancelBy = checkIn ? addDays(checkIn, -2) : "";
  const freeCancel = !checkIn || !today || cancelBy > today;

  const detectedBrand = getCardBrand(cardNumber);

  // Load saved payment methods from Supabase & LocalStorage
  useEffect(() => {
    async function loadSavedPaymentMethods() {
      let fetchedCards: PaymentMethod[] = [];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: pms } = await supabase
            .from("payment_methods")
            .select("id, brand, last4, exp_month, exp_year, is_default")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

        if (pms && pms.length > 0) {
          fetchedCards = pms.map((pm) => ({
            id: pm.id,
            brand: pm.brand as PaymentMethod["brand"],
            last4: pm.last4,
            expMonth: pm.exp_month,
            expYear: pm.exp_year,
            isDefault: pm.is_default,
          }));
        }
      }

      // Merge cards stored in localStorage
      try {
        const localCards: PaymentMethod[] = JSON.parse(
            localStorage.getItem("likehome_saved_cards") || "[]"
        );
        const existingLast4 = new Set(fetchedCards.map((c) => c.last4));
        for (const lc of localCards) {
          if (!existingLast4.has(lc.last4)) {
            fetchedCards.push(lc);
          }
        }
      } catch (e) {
        console.error("Failed to load local cards", e);
      }

      if (fetchedCards.length > 0) {
        setSavedCards(fetchedCards);
        const defaultCard = fetchedCards.find((c) => c.isDefault) || fetchedCards[0];
        if (defaultCard) setSelectedCardId(defaultCard.id);
      }
    }

    loadSavedPaymentMethods();
  }, [supabase]);

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
    const booked = stay.blockedNights.map((o) => addDays(todayISO(), o));
    if (booked.some((night) => night >= checkIn && night < checkOut)) return { field: "dates", message: "Some of those nights are already booked." };
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
    const problem = stayProblem();
    if (problem) return showStayProblem(problem);
    if (!account) return router.push(signInHref());
    setErrors({});
    setPopover(null);
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
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const next: Errors = {};

    if (!text("firstName")) next.firstName = "Enter your first name.";
    if (!text("lastName")) next.lastName = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(text("email"))) next.email = "Enter a valid email address.";

    // Validate only if a new card is selected
    if (selectedCardId === "new") {
      const rawDigits = text("cardNumber").replace(/\D/g, "");
      const brand = getCardBrand(rawDigits);
      const requiredDigits = brand === "Amex" ? 15 : 16;

      if (rawDigits.length !== requiredDigits) {
        next.cardNumber = `Enter a valid ${requiredDigits}-digit card number.`;
      } else if (!validateLuhn(rawDigits)) {
        next.cardNumber = "Invalid card number. Please check for typos.";
      }

      const [monthStr = "", yearStr = ""] = text("expiry").split("/");
      const month = parseInt(monthStr, 10);
      if (!monthStr || month < 1 || month > 12 || text("expiry").length < 5) {
        next.expiry = "Enter a valid expiration date (MM/YY).";
      }

      const requiredCvcLen = brand === "Amex" ? 4 : 3;
      if (text("cvc").length !== requiredCvcLen) {
        next.cvc = `CVC must be ${requiredCvcLen} digits.`;
      }

      if (!text("cardName")) next.cardName = "Enter the name on your card.";
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
    const snapshot = { email: text("email"), roomName: room.name, checkIn, checkOut, adults, children, total };
    setSubmitting(true);

    const selectedCard = savedCards.find((c) => c.id === selectedCardId);
    const payload = checkoutRequest({
      roomId: room.id,
      checkIn,
      checkOut,
      guests: adults + children,
      cardNumber: selectedCard ? `•••• •••• •••• ${selectedCard.last4}` : text("cardNumber"),
      expiry: selectedCard ? `${selectedCard.expMonth}/${selectedCard.expYear.slice(-2)}` : text("expiry"),
      cvc: selectedCard ? "123" : text("cvc"),
      cardName: selectedCard ? text("firstName") : text("cardName"),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    saveRequest.current?.abort();
    const request = new AbortController();
    saveRequest.current = request;
    void saveBooking(snapshot, payload, request.signal, text("expiry"));
  }

  async function saveBooking(
      snapshot: Omit<Booking, "confirmation" | "saved">,
      payload: ReturnType<typeof checkoutRequest>,
      signal: AbortSignal,
      typedExpiry?: string
  ) {
    const fail = (message: string, signIn = false) => {
      setSubmitting(false);
      setErrors(signIn ? { form: message, signIn: "yes" } : { form: message });
    };

    try {
      // ALWAYS Save payment method if "saveCardForFuture" is checked on a new card
      if (selectedCardId === "new" && saveCardForFuture) {
        const rawDigits = cardNumber.replace(/\D/g, "");
        const last4 = rawDigits.slice(-4);
        const [monthStr = "", yearStr = ""] = (typedExpiry || "").split("/");
        const expMonth = monthStr.padStart(2, "0");
        const expYear = `20${yearStr}`;

        const newCardObj: PaymentMethod = {
          id: `card_${Date.now()}`,
          brand: detectedBrand,
          last4,
          expMonth,
          expYear,
          isDefault: savedCards.length === 0,
        };

        // Instant local persistence update
        try {
          const localCards = JSON.parse(localStorage.getItem("likehome_saved_cards") || "[]");
          localStorage.setItem("likehome_saved_cards", JSON.stringify([...localCards, newCardObj]));
        } catch (e) {
          console.error("Failed to write card to localStorage", e);
        }

        // Supabase database insert
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("payment_methods").insert({
            user_id: user.id,
            brand: detectedBrand,
            last4,
            exp_month: expMonth,
            exp_year: expYear,
            is_default: savedCards.length === 0,
          });
        }
      }

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
      router.refresh();
      if (id) {
        router.push(`${PAGE_ROUTES.MY_BOOKINGS}/${id}/confirmed`);
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

              <Card as="section">
                <div className="flex items-center justify-between">
                  <h2 className="text-[32px] font-bold leading-10 text-ink">2. Payment details</h2>
                  {selectedCardId === "new" && (
                      <span className="text-xs font-bold text-blue-dark">{detectedBrand}</span>
                  )}
                </div>

                {/* Saved Cards Selection List */}
                {savedCards.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate">Select payment method</p>
                      <div className="space-y-2">
                        {savedCards.map((card) => (
                            <label
                                key={card.id}
                                className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                                    selectedCardId === card.id
                                        ? "border-blue bg-blue/5 shadow-sm"
                                        : "border-edge bg-surface hover:bg-paper"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="payment_selection"
                                    value={card.id}
                                    checked={selectedCardId === card.id}
                                    onChange={() => setSelectedCardId(card.id)}
                                    className="text-blue focus:ring-blue"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-ink">
                                    {card.brand} ending in {card.last4}
                                  </p>
                                  <p className="text-[11px] text-slate">
                                    Expires {card.expMonth}/{card.expYear}
                                  </p>
                                </div>
                              </div>
                              {card.isDefault && (
                                  <span className="text-[10px] font-medium text-slate bg-paper border border-edge px-2 py-0.5 rounded-md">
                            Default
                          </span>
                              )}
                            </label>
                        ))}

                        <label
                            className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                                selectedCardId === "new"
                                    ? "border-blue bg-blue/5 shadow-sm"
                                    : "border-edge bg-surface hover:bg-paper"
                            }`}
                        >
                          <input
                              type="radio"
                              name="payment_selection"
                              value="new"
                              checked={selectedCardId === "new"}
                              onChange={() => setSelectedCardId("new")}
                              className="text-blue focus:ring-blue"
                          />
                          <span className="text-xs font-semibold text-ink">Use a new credit or debit card</span>
                        </label>
                      </div>
                    </div>
                )}

                {/* New Card Fields */}
                {selectedCardId === "new" && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

                      <div className="sm:col-span-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                              type="checkbox"
                              checked={saveCardForFuture}
                              onChange={(e) => setSaveCardForFuture(e.target.checked)}
                              className="rounded border-edge text-blue focus:ring-blue"
                          />
                          <span className="text-xs text-slate">Save this card to my account for future bookings</span>
                        </label>
                      </div>
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
                        blockedOffsets={stay.blockedNights}
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

              {checkIn && (
                  <Card tone="tint" padding="none" className="mt-5 p-4 text-sm">
                    <p className="font-semibold text-ink">{freeCancel ? `Free cancellation until ${formatDate(cancelBy)}` : "No free cancellation"}</p>
                    <p className="mt-1 text-slate">
                      {freeCancel ? "After that, the first night is non-refundable." : "This booking can’t be cancelled for free. The first night is non-refundable."}
                    </p>
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
                rooms={stay.rooms}
                selectedId={roomId}
                onSelect={(id) => {
                  setRoomId(id);
                  clear("guests");
                }}
                locked={roomsLocked}
                note={() => (freeCancel ? "Free cancellation" : "No free cancellation")}
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
                          <div className="flex justify-between border-t border-edge pt-3 text-lg font-bold text-ink">
                            <dt>Total</dt>
                            <dd>{money(total)}</dd>
                          </div>
                        </dl>
                    ) : (
                        <p className="text-sm text-slate">Add check-in and check-out dates to see pricing.</p>
                    )}

                    <button type="button" onClick={reserve} className={`${buttonPrimary} w-full`}>
                      Reserve
                    </button>
                  </div>
              )}
            </div>
          </aside>
        </div>
      </>
  );
}