import Image from "next/image";
import { activityLabel, formatActivityDate, signedPoints, type PointsActivity } from "@/lib/rewards";

/** Ledger rows: a leaf for points in, a book for points out */
export function HistoryList({ activity, timeZone }: { activity: PointsActivity[]; timeZone: string | null }) {
  return (
    <ul className="divide-y divide-edge">
      {activity.map((item) => (
        <li key={item.id} className="flex items-center gap-4 py-5">
          <span aria-hidden className="flex w-[62px] shrink-0 justify-center">
            {item.points < 0 ? (
              <Image src="/rewards/book.png" alt="" width={62} height={43} className="h-[43px] w-[62px]" />
            ) : (
              <Image src="/rewards/leaf.png" alt="" width={40} height={50} className="h-[50px] w-10" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-ink">{activityLabel(item)}</p>
            <p className="mt-1 text-slate">{formatActivityDate(item.createdAt, timeZone)}</p>
          </div>
          <p className="shrink-0 font-semibold text-ink">{signedPoints(item.points)}</p>
        </li>
      ))}
    </ul>
  );
}
