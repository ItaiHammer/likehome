import type { Metadata } from "next";
import PaymentSection from "@/components/reservation/PaymentSection";

export const metadata: Metadata = {
  title: "Complete your booking",
};

// Shared class strings. These repeat on every field, which is the signal that
// they'll become <Input> and <Card> components in the next step.
const cardClass = "rounded-xl border border-edge bg-white p-6";
const labelClass = "mb-2 block text-base font-semibold text-ink";
const inputClass =
  "h-[46px] w-full rounded-[6.4px] border border-edge bg-white px-4 text-base text-ink placeholder:text-slate focus:placeholder:text-transparent focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";

// Step 4: static page with hardcoded data. Real data comes from the URL + lib/data in step 6.
export default function ReservePage() {
  return (
    <main className="flex-1 bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <p className="text-sm font-semibold tracking-wider text-blue uppercase">
          Secure checkout
        </p>
        <h1 className="mt-2 font-serif text-[32px] leading-10 text-ink">
          Complete your booking
        </h1>
        <p className="mt-2 text-base text-slate">
          Ocean studio at The Salt House · Oct 12–16 · 2 guests
        </p>

        {/* The whole grid is the form, so the submit button in the summary card still belongs to it. */}
        <form className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <section
              className={cardClass}
              aria-labelledby="guest-details-heading"
            >
              <h2
                id="guest-details-heading"
                className="text-xl font-semibold text-ink"
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
                    autoComplete="given-name"
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
                    autoComplete="family-name"
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
                  autoComplete="email"
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
                  autoComplete="tel"
                  placeholder="+1 415 555 0142"
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
                  placeholder="Late check-in, extra pillows…"
                  className={`${inputClass} h-auto py-3`}
                />
              </div>
            </section>

            <PaymentSection />
          </div>

          <section className={cardClass} aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-xl font-semibold text-ink">
              Booking summary
            </h2>

            {/* Placeholder until the room photo is exported to public/images/. */}
            <div className="mt-5 flex aspect-[16/9] items-center justify-center rounded-lg bg-edge text-sm text-slate">
              Room photo
            </div>

            <h3 className="mt-5 text-lg font-semibold text-ink">
              The Salt House
            </h3>
            <p className="mt-1 text-sm text-slate">
              123 Ocean Avenue, San Francisco, CA
            </p>
            <p className="mt-3 text-sm text-slate">Ocean studio · Oct 12–16</p>
            <p className="text-sm text-slate">2 guests · 1 room</p>

            <dl className="mt-5 space-y-3 border-t border-edge pt-5 text-sm text-slate">
              <div className="flex justify-between">
                <dt>$248 × 4 nights</dt>
                <dd>$992</dd>
              </div>
              <div className="flex justify-between">
                <dt>Taxes and fees</dt>
                <dd>$128</dd>
              </div>
              <div className="flex justify-between">
                <dt>LikeHome service fee</dt>
                <dd>$48</dd>
              </div>
              <div className="flex justify-between pt-2 text-lg font-bold text-ink">
                <dt>Total</dt>
                <dd>$1,168 USD</dd>
              </div>
            </dl>

            {/* Only signed-in users with a balance will see this. The server calculates the discount. */}
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-edge p-4 has-checked:border-blue has-checked:bg-blue/10 has-focus-visible:ring-2 has-focus-visible:ring-blue">
              <input
                type="checkbox"
                name="useRewardPoints"
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

            <div className="mt-5 rounded-lg bg-blue/10 p-4">
              <h3 className="text-sm font-semibold text-ink">
                Cancellation policy
              </h3>
              <p className="mt-1 text-sm text-slate">
                Funds are returned in the form of RestAPI rewards points
              </p>
            </div>

            {/* type="button" until step 9 adds a Server Action. A plain submit would put the
                guest's details in the URL as a GET query string. */}
            <button
              type="button"
              className="mt-5 h-[46px] w-full cursor-pointer rounded-[6.4px] bg-blue text-base font-semibold text-white hover:bg-blue/90 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Confirm and book
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
