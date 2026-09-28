"use client";

import { useState } from "react";

type PaymentMethod = "card" | "stripe";

const labelClass = "mb-2 block text-base font-semibold text-ink";
const inputClass =
  "h-[46px] w-full rounded-[6.4px] border border-edge bg-white px-4 text-base text-ink placeholder:text-slate focus:placeholder:text-transparent focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
const tileClass =
  "flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[6.4px] border text-base font-semibold has-checked:ring-2 has-checked:ring-blue has-checked:ring-offset-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-blue";

// PLACEHOLDER: no payment processing. Card inputs have no `name`, so they're never submitted.
export default function PaymentSection() {
  const [method, setMethod] = useState<PaymentMethod>("card");

  return (
    <section
      className="rounded-xl border border-edge bg-white p-6"
      aria-labelledby="payment-heading"
    >
      <h2 id="payment-heading" className="text-xl font-semibold text-ink">
        2. Payment information
      </h2>

      <fieldset className="mt-5">
        <legend className={labelClass}>Payment method</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className={`${tileClass} border-edge bg-white text-ink`}>
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={method === "card"}
              onChange={() => setMethod("card")}
              className="sr-only"
            />
            <CardIcon />
            Card
          </label>

          <label
            className={`${tileClass} border-[#635BFF] bg-[#635BFF] text-white`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="stripe"
              checked={method === "stripe"}
              onChange={() => setMethod("stripe")}
              className="sr-only"
            />
            <span className="font-normal">Pay with</span>
            <span className="text-lg font-bold tracking-tight">stripe</span>
          </label>
        </div>
      </fieldset>

      {method === "card" ? (
        <>
          <div className="mt-5">
            <label htmlFor="cardNumber" className={labelClass}>
              Card number
            </label>
            <input
              id="cardNumber"
              inputMode="numeric"
              autoComplete="off"
              placeholder="1234 1234 1234 1234"
              className={inputClass}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cardExpiry" className={labelClass}>
                Expiration
              </label>
              <input
                id="cardExpiry"
                autoComplete="off"
                placeholder="MM / YY"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="cardCvc" className={labelClass}>
                Security code
              </label>
              <input
                id="cardCvc"
                inputMode="numeric"
                autoComplete="off"
                placeholder="CVC"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="billingAddress" className={labelClass}>
              Billing address
            </label>
            <input
              id="billingAddress"
              autoComplete="off"
              placeholder="123 Ocean Avenue, San Francisco"
              className={inputClass}
            />
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-lg bg-blue/10 p-4 text-sm text-slate">
          After you click{" "}
          <span className="font-semibold text-ink">Confirm and book</span>,
          you&apos;ll be sent to Stripe to finish paying, then brought back
          here.
        </p>
      )}

      <p className="mt-4 text-sm text-slate">
        Payment coming soon. You won&apos;t be charged for this booking.
      </p>
    </section>
  );
}

function CardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
