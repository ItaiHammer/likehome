"use client";

import { useState, use } from "react";
import Image from "next/image";
import AuthBanner from "@/components/reservation/AuthBanner";
import PaymentSection from "@/components/reservation/PaymentSection";
import { RoomsData } from "@/data/rooms";

const cardClass = "rounded-xl border border-edge bg-white p-6 shadow-xs";
const labelClass = "mb-2 block text-base font-semibold text-ink";
const inputClass =
  "h-[46px] w-full rounded-[6.4px] border border-edge bg-white px-4 text-base font-normal text-ink placeholder:text-slate focus:placeholder:text-transparent focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue transition-colors";

interface PageProps {
  searchParams: Promise<{ roomId?: string }>;
}

export default function ReservePage({ searchParams }: PageProps) {
  const resolvedParams = use(searchParams);
  const roomId = resolvedParams?.roomId || "ocean-studio";
  const room = RoomsData[roomId] || RoomsData["ocean-studio"];

  const subtotal = room.pricePerNight * room.nights;
  const grandTotal = subtotal + room.taxes + room.fee;

  const [isGuest, setIsGuest] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
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

  // Toggle Guest vs Saved Account Profile
  const handleSelectAccount = () => {
    setIsGuest(false);
    setFormData((prev) => ({
      ...prev,
      firstName: "Alex",
      lastName: "Morgan",
      email: "alex.morgan@likehome.com",
      phone: "(510) 555-0142",
      cardType: "visa",
      cardNumber: "4111 1111 1111 1111",
      expirationDate: "12/28",
      cvv: "888",
      zipCode: "94538",
      sameAsGuestAddress: true,
    }));
  };

  const handleSelectGuest = () => {
    setIsGuest(true);
    setFormData((prev) => ({
      ...prev,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      cardNumber: "",
      expirationDate: "",
      cvv: "",
      zipCode: "",
    }));
  };

  // Auto-format phone numbers: (510) 600-1010
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bookingId = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

    const query = new URLSearchParams({
      bookingId,
      roomId: room.id,
      email: formData.email,
      firstName: formData.firstName,
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

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <div className="flex flex-col gap-6">
            {/* Top Sign-In / Guest Selector */}
            <AuthBanner
              isGuest={isGuest}
              onSelectGuest={handleSelectGuest}
              onSelectAccount={handleSelectAccount}
            />

            {/* 1. Guest Details Section */}
            <section
              className={cardClass}
              aria-labelledby="guest-details-heading"
            >
              <h2
                id="guest-details-heading"
                className="text-[32px] leading-10 font-bold text-ink"
              >
                1. Guest details
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
                    value={formData.firstName}
                    onChange={handleInputChange}
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
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Morgan"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="alex@example.com"
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="phone" className={labelClass}>
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(510) 555-0142"
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="specialRequests" className={labelClass}>
                  Special requests{" "}
                  <span className="font-normal text-slate">(optional)</span>
                </label>
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  rows={3}
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  placeholder="Late check-in, extra pillows…"
                  className={`${inputClass} h-auto resize-none py-3`}
                />
              </div>
            </section>

            {/* 2. Payment Details Section */}
            <PaymentSection
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
              }}
              onChange={handleInputChange}
            />
          </div>

          {/* Booking Summary Column */}
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

            {/* Check-In / Check-Out Schedule */}
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

            {/* Amenities Highlights */}
            {room.amenities && room.amenities.length > 0 && (
              <div className="mt-4 border-t border-edge pt-4">
                <p className="text-xs font-semibold tracking-wider text-slate uppercase">
                  Included Amenities
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {room.amenities.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-edge bg-paper px-2 py-1 text-xs text-ink"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Breakdown */}
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
              <div className="flex justify-between pt-2 text-lg font-bold text-ink">
                <dt>Total</dt>
                <dd>${grandTotal} USD</dd>
              </div>
            </dl>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 h-[46px] w-full cursor-pointer rounded-[6.4px] bg-blue text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isSubmitting ? "Processing..." : "Confirm and book"}
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