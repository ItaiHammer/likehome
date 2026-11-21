import { STAY_DISCOUNTS, rewardPrice } from "@/lib/rewards";
import { Card } from "../../_components/ui";
import { PointsAmount } from "../../_components/rewards/PointsAmount";
import { RewardCard } from "../../_components/rewards/RewardCard";
import { RewardCarousel } from "../../_components/rewards/RewardCarousel";

type RewardsSectionProps = {
  step: number;
  hotelName: string;
  balance: number;
  /** The checkout total, which each discount is a percent of */
  total: number;
  appliedId: string | null;
  onApply: (id: string) => void;
  onRemove: () => void;
};

/** Checkout step "Rewards" (Figma frame 02). One stay discount at a time, paid with points. */
export function RewardsSection({ step, hotelName, balance, total, appliedId, onApply, onRemove }: RewardsSectionProps) {
  return (
    <Card as="section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[32px] font-bold leading-10 text-ink">{step}. Rewards</h2>
          <p className="mt-1 text-sm text-slate">Pay for part of your stay with points.</p>
        </div>
        <p className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface py-1 pl-2 pr-3 text-sm font-semibold text-blue-dark">
          <PointsAmount points={balance} size="xs" /> available
        </p>
      </div>

      <div className="mt-5">
        <RewardCarousel label={`Rewards for your stay at ${hotelName}`}>
          {STAY_DISCOUNTS.map((reward) => {
            const { points, value } = rewardPrice(reward, total);
            return (
              <RewardCard
                key={reward.id}
                reward={reward}
                points={points}
                value={value}
                balance={balance}
                applied={reward.id === appliedId}
                // A discount is a share of the total, so it needs dates first
                unavailable={total > 0 ? undefined : "Add dates first"}
                onApply={() => onApply(reward.id)}
                onRemove={onRemove}
              />
            );
          })}
        </RewardCarousel>
      </div>
      <p className="mt-4 text-sm text-slate">One reward per booking. 100 pts = $1, taken off your total.</p>
    </Card>
  );
}

/** Shown instead of the cards when the points balance couldn't be read */
export function RewardsUnavailable({ step }: { step: number }) {
  return (
    <Card as="section">
      <h2 className="text-[32px] font-bold leading-10 text-ink">{step}. Rewards</h2>
      <p role="status" className="mt-2 text-sm text-slate">
        We couldn’t load your points right now. You can still book, or refresh the page to use rewards.
      </p>
    </Card>
  );
}
