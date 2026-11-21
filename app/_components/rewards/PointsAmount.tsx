import Image from "next/image";
import { formatPoints, pointsNumber } from "@/lib/rewards";

const SIZES = {
  xs: { text: "text-sm", leaf: "h-[25px] w-5", width: 20, height: 25 },
  sm: { text: "font-serif text-base text-ink", leaf: "h-[30px] w-6", width: 24, height: 30 },
  md: { text: "font-serif text-lg text-ink", leaf: "h-[31px] w-[25px]", width: 25, height: 31 },
};

/** Leaf + number. "lg" is the balance on the overview; "sm" and "md" price a reward; "xs" sits in a badge and takes its font. */
export function PointsAmount({ points, size = "sm", className = "" }: { points: number; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
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
    <span className={`inline-flex items-center gap-1 ${text} ${className}`}>
      <Image src="/rewards/leaf.png" alt="" width={width} height={height} className={leaf} />
      {formatPoints(points)}
    </span>
  );
}
