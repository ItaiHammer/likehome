import Image from "next/image";
import { formatPoints, pointsNumber } from "@/lib/rewards";

const SIZES = {
  sm: { text: "text-base", leaf: "h-[30px] w-6", width: 24, height: 30 },
  md: { text: "text-lg", leaf: "h-[31px] w-[25px]", width: 25, height: 31 },
};

/** Leaf + serif number. "lg" is the balance on the overview; "sm" and "md" price a reward. */
export function PointsAmount({ points, size = "sm", className = "" }: { points: number; size?: "sm" | "md" | "lg"; className?: string }) {
  if (size === "lg") {
    return (
      <span className={`inline-flex items-center gap-2 font-serif text-[48px] leading-none text-ink ${className}`}>
        <Image src="/rewards/leaf.png" alt="" width={60} height={75} className="h-[75px] w-[60px]" />
        {pointsNumber(points)}
      </span>
    );
  }
  const { text, leaf, width, height } = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-1 font-serif text-ink ${text} ${className}`}>
      <Image src="/rewards/leaf.png" alt="" width={width} height={height} className={leaf} />
      {formatPoints(points)}
    </span>
  );
}
