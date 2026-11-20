import { money } from "@/lib/bookings";
import { pointsNeeded, pointsNumber, type StayDiscount } from "@/lib/rewards";
import { PointsAmount } from "./PointsAmount";

type RewardCardProps = {
  reward: StayDiscount;
  /** What it costs and saves for this stay (rewardPrice) */
  points: number;
  value: number;
  balance: number;
  applied?: boolean;
  /** Why it can't be applied right now, e.g. "Add dates first" */
  unavailable?: string;
  onApply?: () => void;
  onRemove?: () => void;
};

// One reward in a row of cards (Figma "Redeem Rewards Card"): applied > unavailable > not enough points > apply
export function RewardCard({ reward, points, value, balance, applied = false, unavailable, onApply, onRemove }: RewardCardProps) {
  const missing = pointsNeeded(balance, points);
  const locked = !applied && !unavailable && missing > 0;
  const tone = applied ? "border-blue bg-blue/5 ring-2 ring-inset ring-blue" : locked ? "border-edge bg-disabled" : "border-edge bg-surface";

  return (
    <article aria-label={reward.title} className={`flex h-[255px] w-full flex-col rounded-lg border p-3 ${tone}`}>
      <p className={`text-xs font-semibold uppercase ${locked ? "text-slate" : "text-blue-dark"}`}>{reward.category}</p>
      <div className="mt-6 px-3">
        <h3 className="min-h-10 text-base font-semibold leading-5 text-ink">{reward.title}</h3>
        {points > 0 ? (
          <>
            <p className="mt-1 text-sm text-slate">
              {applied ? "Saved" : "Save"} {money(value)}
            </p>
            <PointsAmount points={points} size="md" className="mt-4" />
          </>
        ) : (
          <p className="mt-1 text-sm text-slate">Priced from your stay’s dates</p>
        )}
      </div>

      <div className="mt-auto flex min-h-[30px] items-center justify-center gap-3">
        {applied ? (
          <>
            <span className="inline-flex h-[30px] items-center gap-1 rounded-control bg-blue/10 px-3 text-sm font-semibold text-blue-dark">
              <span aria-hidden>✓</span> Applied
            </span>
            {onRemove && (
              <button type="button" onClick={onRemove} aria-label={`Remove ${reward.title}`} className="rounded-control px-1 text-xs text-ink hover:text-blue-dark hover:underline focus-visible:outline-2 focus-visible:outline-blue">
                Remove
              </button>
            )}
          </>
        ) : unavailable ? (
          <p className="inline-flex h-[30px] items-center rounded-control bg-disabled px-3 text-xs font-semibold text-slate">{unavailable}</p>
        ) : locked ? (
          <p className="whitespace-nowrap text-xs font-semibold text-slate">{pointsNumber(missing)} more pts needed</p>
        ) : (
          <button
            type="button"
            onClick={onApply}
            aria-label={`Apply ${reward.title}`}
            className="h-[30px] w-[90px] rounded-control bg-blue text-sm font-semibold text-on-blue transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            Apply
          </button>
        )}
      </div>
    </article>
  );
}
