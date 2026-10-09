import Link from "next/link";
import Image from "next/image";
import { RoomsData } from "@/data/rooms";

interface PageProps {
  searchParams: Promise<{
    bookingId?: string;
    roomId?: string;
    email?: string;
    firstName?: string;
    total?: string;
    usedPoints?: string;
  }>;
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const bookingId = resolvedParams.bookingId || "BK-849201";
  const roomId = resolvedParams.roomId || "ocean-studio";
  const email = resolvedParams.email || "guest@example.com";
  const firstName = resolvedParams.firstName || "Valued Guest";
  const passedTotal = resolvedParams.total;
  const usedPoints = resolvedParams.usedPoints === "true";

  const room = RoomsData[roomId] || RoomsData["ocean-studio"];
  const subtotal = room.pricePerNight * room.nights;

  const REWARD_DISCOUNT_VALUE = 24;
  const rewardDiscount = usedPoints ? REWARD_DISCOUNT_VALUE : 0;
  const calculatedTotal = Math.max(
    0,
    subtotal + room.taxes + room.fee - rewardDiscount
  );
  const displayTotal = passedTotal ? Number(passedTotal) : calculatedTotal;

  return (
    <main className="flex-1 bg-paper py-12 px-4 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Success Header Card */}
        <div className="rounded-xl border border-edge bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue/10 text-blue">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-bold text-ink sm:text-4xl">
            Booking Confirmed, {firstName}!
          </h1>
          <p className="mt-2 text-base text-slate">
            We’ve sent a confirmation email with details to{" "}
            <span className="font-semibold text-ink">{email}</span>.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-paper px-4 py-2 border border-edge">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate">
              CONFIRMATION CODE:
            </span>
            <span className="font-mono text-lg font-bold text-blue">
              {bookingId}
            </span>
          </div>
        </div>

        {/* Reservation Details Card */}
        <div className="mt-6 rounded-xl border border-edge bg-white p-6 shadow-xs">
          <h2 className="text-xl font-bold text-ink">Reservation details</h2>

          <div className="mt-4 grid gap-6 sm:grid-cols-[12rem_1fr]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-edge">
              <Image
                src={room.image}
                alt={room.name}
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover"
                priority
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ink">
                {room.property}
              </h3>
              <p className="text-sm text-slate">{room.address}</p>

              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-edge pt-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate">
                    Room Type
                  </dt>
                  <dd className="mt-0.5 font-medium text-ink">{room.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate">
                    Dates
                  </dt>
                  <dd className="mt-0.5 font-medium text-ink">{room.dates}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate">
                    Check-in
                  </dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    After {room.checkIn}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate">
                    Check-out
                  </dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    Before {room.checkOut}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="mt-6 border-t border-edge pt-6">
            <h3 className="text-base font-semibold text-ink">
              Payment summary
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-slate">
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

              {usedPoints && (
                <div className="flex justify-between font-medium text-emerald-600">
                  <dt>Reward points applied (2,400 pts)</dt>
                  <dd>-$24</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-edge pt-2 font-bold text-ink">
                <dt>Total Paid</dt>
                <dd>${displayTotal} USD</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Back Home Button (Blank link left for teammates) */}
        <div className="mt-8 text-center">
          <Link
            href="#"
            className="inline-flex h-[46px] items-center justify-center rounded-[6.4px] bg-blue px-8 text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}