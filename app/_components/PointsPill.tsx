import Link from "next/link";
import { PAGE_ROUTES } from "@/constants/routes";
import { formatPoints } from "@/lib/rewards";
import { PointsAmount } from "./rewards/PointsAmount";

/** Header points balance (Figma "Points Display"), linking to the rewards overview */
export function PointsPill({ points }: { points: number }) {
  return (
    <Link
      href={PAGE_ROUTES.REWARDS}
      aria-label={`${formatPoints(points)}, view rewards`}
      className="hidden h-9 items-center gap-1 rounded-xl border border-edge bg-surface py-1 pl-1.5 pr-3 text-sm text-ink transition-colors hover:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:inline-flex"
    >
      <PointsAmount points={points} size="xs" />
    </Link>
  );
}
