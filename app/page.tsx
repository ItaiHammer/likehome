"use client";

import { useState } from "react";
import Image from "next/image";
import AuthBanner from "@/components/reservation/AuthBanner";
import PaymentSection from "@/components/reservation/PaymentSection";
import { RoomsData } from "@/data/rooms";

const cardClass = "rounded-xl border border-edge bg-white p-6 shadow-xs";
const labelClass = "mb-2 block text-base font-semibold text-ink";
const inputClass =
  "h-[46px] w-full rounded-[6.4px] border border-edge bg-white px-4 text-base font-normal text-ink placeholder:text-slate focus:placeholder:text-transparent focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue transition-colors disabled:bg-slate/10 disabled:cursor-not-allowed";

export default function HomePage() {
  const room = RoomsData["ocean-studio"];
  const subtotal = room.pricePerNight * room.nights;

  const ACCOUNT_EMAIL = "alex.morgan@likehome.com";
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    primaryStreet: "",
    primaryCity: "",
    primaryState: "",
    primaryZip: "",
    specialRequests: "",
    cardType: "visa",
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    zipCode: "",
    sameAsGuestAddress: true,
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    useRewardPoints: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const REWARD_DISCOUNT_VALUE = 24;
  const rewardDiscount = formData.useRewardPoints ? REWARD_DISCOUNT_VALUE : 0;
  const grandTotal = Math.max(0, subtotal + room.taxes + room.fee - rewardDiscount);

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
    setFormData((prev) => ({ ...prev, [e.target.name]: sanitized }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleAuthToggle = () => {
    const nextState = !isSignedIn;
    setIsSignedIn(nextState);
    setFormError("");
    if (nextState) {
      setFormData((prev) => ({
        ...prev,
        firstName: "Alex",
        lastName: "Morgan",
        email: "alex.morgan@gmail.com",
        phone: "(510) 555-0142",
        primaryStreet: "123 Main St, Apt 4B",
        primaryCity: "Fremont",
        primaryState: "CA",
        primaryZip: "94538",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        primaryStreet: "",
        primaryCity: "",
        primaryState: "",
        primaryZip: "",
        useRewardPoints: false,
      }));
    }
  };

  const validateForm = (): boolean => {
    setFormError("");

    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (
      !nameRegex.test(formData.firstName.trim()) ||
      !nameRegex.test(formData.lastName.trim())
    ) {
      setFormError("First and last names can only contain letters.");
      return false;
    }

    const publicProvidersRegex =
      /^[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook|icloud|aol|protonmail|proton|live|msn)\.(com|net|org|me)$/i;

    if (!publicProvidersRegex.test(formData.email.trim())) {
      setFormError(
        "Please enter a valid email address from a recognized provider (e.g. gmail.com, yahoo.com, outlook.com, icloud.com)."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    const bookingId = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

    const query = new URLSearchParams({
      bookingId,
      roomId: room.id,
      email: formData.email,
      firstName: formData.firstName,
      total: grandTotal.toString(),
      usedPoints: formData.useRewardPoints.toString(),
    }).toString();

    window.location.href = `/reserve/confirmation?${query}`;
  };

  return (
    <main className="flex-1 bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <p className="text-sm font-semibold tracking-wider text-blue uppercase">
          Secure checkout
        </p>
        <h1 className="mt-2 font-serif text-[32px] leading-10 font-bold text-ink">
          Complete your booking
        </h1>
        <p className="mt-2 text-base text-slate">
          {room.name} at {room.property} · {room.dates} · {room.guests}
        </p>

        {formError && (
          <div className="mt-4 rounded-xl bg-rose-50 p-4 border border-rose-200 text-sm font-semibold text-rose-700">
            ⚠️ {formError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <div className="flex flex-col gap-6">
            <AuthBanner
              isSignedIn={isSignedIn}
              userEmail={ACCOUNT_EMAIL}
              onSignOut={handleAuthToggle}
            />

            <section
              className={`${cardClass} ${!isSignedIn ? "opacity-60 pointer-events-none" : ""}`}
              aria-labelledby="guest-details-heading"
            >
              <h2
                id="guest-details-heading"
                className="text-[32px] leading-10 font-bold text-ink"
              >
                1. Account details
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClass}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    required
                    disabled={!isSignedIn}
                    value={formData.firstName}
                    onChange={handleNameInput}
                    placeholder="Alex"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    required
                    disabled={!isSignedIn}
                    value={formData.lastName}
                    onChange={handleNameInput}
                    placeholder="Morgan"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    disabled={!isSignedIn}
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="alex@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    disabled={!isSignedIn}
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(510) 555-0142"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-edge pt-5">
                <p className="text-xs font-bold tracking-wider text-slate uppercase mb-3">
                  Account Primary Address
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="primaryStreet" className={labelClass}>
                      Street address
                    </label>
                    <input
                      id="primaryStreet"
                      name="primaryStreet"
                      disabled={!isSignedIn}
                      value={formData.primaryStreet}
                      onChange={handleInputChange}
                      placeholder="123 Main St, Apt 4B"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="primaryCity" className={labelClass}>
                      City
                    </label>
                    <input
                      id="primaryCity"
                      name="primaryCity"
                      disabled={!isSignedIn}
                      value={formData.primaryCity}
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
                        handleInputChange(e);
                      }}
                      placeholder="Fremont"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="primaryState" className={labelClass}>
                        State
                      </label>
                      <input
                        id="primaryState"
                        name="primaryState"
                        maxLength={2}
                        disabled={!isSignedIn}
                        value={formData.primaryState}
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
                          handleInputChange(e);
                        }}
                        placeholder="CA"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="primaryZip" className={labelClass}>
                        ZIP
                      </label>
                      <input
                        id="primaryZip"
                        name="primaryZip"
                        disabled={!isSignedIn}
                        value={formData.primaryZip}
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 5);
                          handleInputChange(e);
                        }}
                        placeholder="94538"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-edge pt-5">
                <label htmlFor="specialRequests" className={labelClass}>
                  Special requests{" "}
                  <span className="font-normal text-slate">(optional)</span>
                </label>
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  rows={2}
                  disabled={!isSignedIn}
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  placeholder="Late check-in, extra pillows…"
                  className={`${inputClass} h-auto resize-none py-3`}
                />
              </div>
            </section>

            <div className={!isSignedIn ? "opacity-60 pointer-events-none" : ""}>
              <PaymentSection
                isSignedIn={isSignedIn}
                values={{
                  cardType: formData.cardType,
                  cardNumber: formData.cardNumber,
                  expirationDate: formData.expirationDate,
                  cvv: formData.cvv,
                  zipCode: formData.zipCode,
                  sameAsGuestAddress: formData.sameAsGuestAddress,
                  billingAddress: formData.billingAddress,
                  billingCity: formData.billingCity,
                  billingState: formData.billingState,
                  billingZip: formData.billingZip,
                  primaryStreet: formData.primaryStreet,
                  primaryCity: formData.primaryCity,
                  primaryState: formData.primaryState,
                  primaryZip: formData.primaryZip,
                }}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <section className={cardClass} aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-xl font-semibold text-ink">
              Booking summary
            </h2>

            <div className="relative mt-5 aspect-[16/9] w-full overflow-hidden rounded-lg bg-edge text-sm text-slate">
              <Image
                src={room.image}
                alt={room.name}
                fill
                sizes="(max-width: 1024px) 100vw, 352px"
                className="object-cover"
                priority
              />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-ink">
              {room.property}
            </h3>
            <p className="mt-1 text-sm text-slate">{room.address}</p>
            <p className="mt-3 text-sm text-slate">
              {room.name} · {room.dates}
            </p>
            <p className="text-sm text-slate">{room.guests} · 1 room</p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 text-xs">
              <div>
                <span className="block font-semibold text-slate uppercase">Check-in</span>
                <span className="font-medium text-ink">After {room.checkIn}</span>
              </div>
              <div>
                <span className="block font-semibold text-slate uppercase">Check-out</span>
                <span className="font-medium text-ink">Before {room.checkOut}</span>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-edge pt-5 text-sm text-slate">
              <div className="flex justify-between">
                <dt>
                  ${room.pricePerNight} × {room.nights} nights
                </dt>
                <dd>${subtotal}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Taxes and fees</dt>
                <dd>${room.taxes}</dd>
              </div>
              <div className="flex justify-between">
                <dt>LikeHome service fee</dt>
                <dd>${room.fee}</dd>
              </div>

              {isSignedIn && formData.useRewardPoints && (
                <div className="flex justify-between font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                  <dt>Reward points discount (2,400 pts)</dt>
                  <dd>-$24</dd>
                </div>
              )}

              <div className="flex justify-between pt-2 text-lg font-bold text-ink border-t border-edge">
                <dt>Total</dt>
                <dd>${grandTotal} USD</dd>
              </div>
            </dl>

            {isSignedIn && (
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-edge p-4 has-checked:border-blue has-checked:bg-blue/10 has-focus-visible:ring-2 has-focus-visible:ring-blue">
                <input
                  type="checkbox"
                  name="useRewardPoints"
                  checked={formData.useRewardPoints}
                  onChange={handleInputChange}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-blue focus:outline-none"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    Use rewards points
                  </span>
                  <span className="block text-sm text-slate">
                    You have 2,400 points (worth $24)
                  </span>
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={!isSignedIn || isSubmitting}
              className="mt-5 h-[46px] w-full cursor-pointer rounded-[6.4px] bg-blue text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {!isSignedIn
                ? "Sign In Required to Book"
                : isSubmitting
                ? "Processing..."
                : "Confirm and book"}
            </button>

            <p className="mt-3 text-center text-sm text-slate">
              By booking, you agree to the house rules and booking terms.
            </p>
          </section>
        </form>
      </div>
    </main>
  );
}