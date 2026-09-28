import Image from "next/image";
import type { ReactNode } from "react";

const labelClass = "mb-2 block text-base font-semibold text-ink";
const inputClass =
  "h-[46px] w-full rounded-[6.4px] border border-edge bg-white px-4 text-base text-ink placeholder:text-slate focus:placeholder:text-transparent focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
const expressButtonClass =
  "flex h-[46px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6.4px] text-lg font-semibold hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:outline-none";

// Brand colors are an intentional exception to the LikeHome palette (Apple, Google, and Stripe require them).
// `name` is the accessible label; the logos are decorative (alt="").
const expressMethods: { name: string; className: string; label: ReactNode }[] =
  [
    {
      name: "Link",
      className: "bg-[#00D66F]",
      label: (
        <Image src="/images/payment/link.svg" alt="" width={54} height={18} />
      ),
    },
    {
      name: "Apple Pay",
      className: "bg-black",
      label: (
        <Image
          src="/images/payment/Apple_Pay-White-Logo.wine.svg"
          alt=""
          width={63}
          height={30}
        />
      ),
    },
    {
      name: "Google Pay",
      className: "bg-black text-white",
      label: (
        <>
          <Image
            src="/images/payment/google-g.svg"
            alt=""
            width={20}
            height={20}
          />
          Pay
        </>
      ),
    },
  ];

// PLACEHOLDER: no payment processing. Express buttons stand in for Stripe's Express Checkout
// Element, and the card inputs for its Payment Element. Card inputs have no `name`, so they're never submitted.
export default function PaymentSection() {
  return (
    <section
      className="rounded-xl border border-edge bg-white p-6"
      aria-labelledby="payment-heading"
    >
      <h2 id="payment-heading" className="text-xl font-semibold text-ink">
        2. Payment information
      </h2>

      <div className="mt-5">
        <p className={labelClass}>Express checkout</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {expressMethods.map((method) => (
            <button
              key={method.name}
              type="button"
              aria-label={method.name}
              className={`${expressButtonClass} ${method.className}`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 text-sm text-slate">
        <span className="h-px flex-1 bg-edge" />
        or pay with card
        <span className="h-px flex-1 bg-edge" />
      </div>

      <div className="mt-6">
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

      <p className="mt-4 text-sm text-slate">
        Payment coming soon. You won&apos;t be charged for this booking.
      </p>
    </section>
  );
}
